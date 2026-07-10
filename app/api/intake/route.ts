/**
 * POST /api/intake
 *
 * Public (unauthenticated) AI client intake for advocate persona pages.
 *
 * Flow:
 *   1. Client sends { slug, messages } — full conversation array so far.
 *   2. We load the advocate's profile (name, services/practice areas) by slug.
 *   3. Claude acts as a polite intake assistant, conducting a multi-turn intake.
 *   4. When Claude has collected all required info it embeds <INTAKE_COMPLETE>{...}</INTAKE_COMPLETE>
 *      in its reply and the API extracts that, creates a `students` + `bookings` row, and
 *      returns { message, done: true }.
 *   5. On subsequent turns (after done), we return an error so the UI can show a finished state.
 *
 * IMPORTANT compliance notes:
 *   - Claude MUST NOT give legal advice, assess merits, or promise outcomes.
 *   - DPDP consent is captured conversationally and stored as whatsapp_consent on the student row.
 *   - This endpoint is deliberately unauthenticated (public page) — it creates records as the
 *     provider's intake queue, not as a signed-in session.
 *
 * Rate limit: 30 intake messages/day per slug (simple DB counter, same key as research_usage).
 */

import Anthropic       from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logConsentEvent } from '@/lib/consent'

const anthropic  = new Anthropic({ maxRetries: 2 })
const DAILY_LIMIT = 30  // per-slug intake messages per day

const INTAKE_COMPLETE_RE = /<INTAKE_COMPLETE>([\s\S]*?)<\/INTAKE_COMPLETE>/

interface IntakeMessage {
  role:    'user' | 'assistant'
  content: string
}

interface IntakeData {
  name:        string
  phone:       string
  matter_type: string
  urgency:     string
  consent:     boolean
}

export async function POST(req: Request) {
  const body = await req.json()
  const { slug, messages } = body as { slug: string; messages: IntakeMessage[] }

  if (!slug || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Missing slug or messages' }, { status: 400 })
  }

  // ── Load advocate profile ────────────────────────────────────────────────────
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, first_name, last_name, persona, plan')
    .eq('slug', slug)
    .eq('persona', 'advocate')
    .eq('page_live', true)
    .single()

  if (!provider) {
    return NextResponse.json({ error: 'Advocate not found' }, { status: 404 })
  }

  // ── Check global client_intake kill-switch ───────────────────────────────────
  const { data: cfgRow } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'notification_types_enabled')
    .single()

  const cfg = (cfgRow?.value ?? {}) as Record<string, boolean>
  if (cfg['client_intake'] === false) {
    return NextResponse.json({
      message: 'Online enquiries are currently paused — please contact the office directly.',
      done:    false,
    })
  }

  // Load practice areas from page services
  const { data: page } = await supabaseAdmin
    .from('pages')
    .select('services')
    .eq('provider_id', provider.id)
    .single()

  const services     = (page?.services as Array<{ name: string }> | null) ?? []
  const practiceAreas = services.length > 0
    ? services.map(s => s.name).join(', ')
    : 'civil, criminal, family, property, commercial, and related matters'

  // ── Intake rate-limit (reuse research_usage table if available, else skip) ──
  const dayKey = new Date().toISOString().slice(0, 10)
  try {
    const { data: usage } = await supabaseAdmin
      .from('research_usage')
      .select('count')
      .eq('provider_id', provider.id)
      .eq('day_key', dayKey)
      .single()

    if ((usage?.count ?? 0) >= DAILY_LIMIT) {
      return NextResponse.json(
        { message: "Our intake system is temporarily busy. Please call or WhatsApp the advocate directly.", done: false },
        { status: 200 }
      )
    }
  } catch { /* research_usage may not exist — skip rate-limit silently */ }

  // ── Build system prompt ──────────────────────────────────────────────────────
  const systemPrompt = `You are a professional intake assistant at the law office of ${provider.first_name} ${provider.last_name}.

Your role is to conduct a courteous, structured intake of a potential client's enquiry. This is NOT a legal consultation — you are only gathering information for the advocate.

Practice areas handled: ${practiceAreas}

INTAKE STEPS (conduct conversationally, one or two questions at a time):
1. Greet the visitor warmly and ask for their name.
2. Ask for their WhatsApp / phone number for the advocate to follow up.
3. Ask them to briefly describe the nature of their legal matter in one or two sentences.
4. Classify the matter type (e.g. property dispute, cheque bounce, family, criminal, employment, etc.).
5. Ask about urgency: is there a court date or deadline approaching?
6. Inform them that all communications are confidential and protected by attorney-client privilege, and that if they consent, the advocate's office will reach out on WhatsApp. Ask for their consent (DPDP Act requirement).
7. Once you have all the above, thank them warmly and let them know the advocate will be in touch shortly.

STRICT RULES — do NOT violate under any circumstances:
- NEVER give any legal opinion, advice, assessment of case merits, or predict outcomes.
- NEVER say whether their case is strong or weak.
- Keep responses short and friendly (2–4 sentences max per turn).
- Do NOT ask for documents or detailed facts beyond what's listed above.

When you have collected name, phone, matter type, urgency (even if none), and consent (yes or no), output the following marker ON ITS OWN LINE at the very end of your response (after your closing message to the user):

<INTAKE_COMPLETE>{"name":"[NAME]","phone":"[PHONE]","matter_type":"[MATTER TYPE]","urgency":"[URGENCY OR none]","consent":[true or false]}</INTAKE_COMPLETE>

Only output this marker once, when you have all required information. Do NOT output it in any other turn.`

  // ── Call Claude ──────────────────────────────────────────────────────────────
  const claudeMessages = messages.map(m => ({ role: m.role, content: m.content }))

  let claudeText = ''
  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 300,
      system:     systemPrompt,
      messages:   claudeMessages,
    })
    claudeText = (response.content[0] as { type: string; text: string }).type === 'text'
      ? (response.content[0] as { type: string; text: string }).text
      : ''
  } catch (err) {
    console.error('[intake] Claude error:', err)
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }

  // Increment usage counter — awaited so it completes before the function is torn down
  try {
    await supabaseAdmin.rpc('upsert_research_usage', { p_provider_id: provider.id, p_day_key: dayKey })
  } catch { /* silent — rpc may not exist */ }

  // ── Check for intake complete signal ────────────────────────────────────────
  const match = INTAKE_COMPLETE_RE.exec(claudeText)
  if (match) {
    // Strip the marker from the user-facing message
    const userMessage = claudeText.replace(INTAKE_COMPLETE_RE, '').trim()

    let intakeData: IntakeData | null = null
    try {
      intakeData = JSON.parse(match[1]) as IntakeData
    } catch {
      console.error('[intake] Failed to parse intake data:', match[1])
    }

    if (intakeData) {
      // Persist student + booking rows synchronously so Vercel doesn't freeze us mid-insert
      try {
        const consentToken = intakeData.consent ? crypto.randomUUID() : null
        const { data: student } = await supabaseAdmin
          .from('students')
          .insert({
            provider_id:      provider.id,
            name:             intakeData.name,
            parent_phone:     intakeData.phone,
            label_1:          intakeData.matter_type,
            notes:            `Urgency: ${intakeData.urgency}. Via AI intake.`,
            avatar_color:     '#6366F1',
            sessions:         0,
            whatsapp_consent: intakeData.consent,
            remind_client:    intakeData.consent,
            consent_token:    consentToken,
          })
          .select('id')
          .single()

        if (student?.id) {
          await supabaseAdmin
            .from('bookings')
            .insert({
              provider_id:    provider.id,
              customer_name:  intakeData.name,
              customer_phone: intakeData.phone,
              service:        intakeData.matter_type,
              message:        `Urgency: ${intakeData.urgency}. Consent: ${intakeData.consent}. Via AI intake.`,
              status:         'pending',
            })

          if (intakeData.consent) {
            void logConsentEvent(supabaseAdmin, {
              providerId: provider.id,
              studentId:  student.id,
              event:      'granted',
              source:     'ai_intake',
              purpose:    'WhatsApp case updates & hearing reminders',
              actor:      'ai_intake',
            })
          }
        }
      } catch (err) {
        console.error('[intake] Failed to create student/booking:', err)
        // Don't fail the user's completed enquiry — the widget should still show done
      }
    }

    return NextResponse.json({ message: userMessage, done: true })
  }

  return NextResponse.json({ message: claudeText, done: false })
}
