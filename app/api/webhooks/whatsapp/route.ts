import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// ── Webhook verification (Meta calls this once when you register the webhook) ──
export async function GET(req: NextRequest) {
  const mode      = req.nextUrl.searchParams.get('hub.mode')
  const token     = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// ── Inbound message handler ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || body.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ok: true })
  }

  const msg = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  if (!msg || msg.type !== 'text') return NextResponse.json({ ok: true })

  const senderPhone = msg.from as string           // "14698456789" — matches providers.whatsapp_number
  const messageText = (msg.text?.body as string)?.trim()

  if (!senderPhone || !messageText) return NextResponse.json({ ok: true })

  // Process synchronously — Meta expects 200 within 5s; AI replies usually <3s
  await handleInbound(senderPhone, messageText)

  return NextResponse.json({ ok: true })
}

// ─────────────────────────────────────────────────────────────────────────────

const WA_SYSTEM_PROMPT = `You are Kryla, a helpful assistant for small business owners managing their public profile page via WhatsApp.

Respond with ONLY valid JSON — no extra text before or after. Shape:
{
  "message": "string — short, friendly reply (2-3 sentences max, plain text, no markdown symbols)",
  "patch_pages": {},
  "patch_providers": {}
}

patch_pages fields you can set:
- headline, subheadline, bio, cta_primary, cta_secondary
- services (FULL array: [{name, description, duration_or_unit, price}])
- highlights (FULL array: [{icon, title, body}])
- faq (FULL array: [{question, answer}])

patch_providers fields you can set:
- location (city or address — becomes a Google Maps link on their page)

Rules:
- Always return the COMPLETE array for services / highlights / faq — never partial
- WhatsApp edits go live immediately — say "Done! Your page is updated and live." when changes are made
- For things you cannot do (upload photo, change colour, change layout), say so briefly and mention they can do it in mychat
- Keep message short — this is WhatsApp, not a chat window
- If the request is unclear, ask one short clarifying question

Current page content:
{{PROFILE}}`

async function handleInbound(senderPhone: string, messageText: string) {
  // Find provider by whatsapp_number — stored as digits+country code, same format Meta sends
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, slug, first_name, whatsapp_number')
    .eq('whatsapp_number', senderPhone)
    .maybeSingle()

  if (!provider) {
    await sendWhatsAppMessage({
      to: senderPhone,
      text: "This number isn't linked to a Kryla account. Visit kryla.work to get started.",
    })
    return
  }

  // PUBLISH command — applies any pending mychat draft to the live page
  if (/^publish$/i.test(messageText)) {
    await applyDraftAndPublish(provider.id, provider.slug)
    await sendWhatsAppMessage({
      to: senderPhone,
      text: `Published! Your page is live at kryla.work/${provider.slug}`,
    })
    return
  }

  // Fetch current live content for AI context
  const [{ data: page }, { data: prov }] = await Promise.all([
    supabaseAdmin
      .from('pages')
      .select('headline, subheadline, bio, cta_primary, cta_secondary, services, highlights, faq')
      .eq('provider_id', provider.id)
      .single(),
    supabaseAdmin
      .from('providers')
      .select('location')
      .eq('id', provider.id)
      .single(),
  ])

  const profile = {
    firstName: provider.first_name,
    location: prov?.location ?? null,
    ...(page ?? {}),
  }

  const systemPrompt = WA_SYSTEM_PROMPT.replace('{{PROFILE}}', JSON.stringify(profile, null, 2))

  const completion = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: messageText }],
  })

  const raw = completion.content[0].type === 'text' ? completion.content[0].text : ''

  let parsed: {
    message: string
    patch_pages?: Record<string, unknown>
    patch_providers?: Record<string, unknown>
  }
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
  } catch {
    await sendWhatsAppMessage({
      to: senderPhone,
      text: "Got your message! Could you rephrase what you'd like to update on your page?",
    })
    return
  }

  const { message, patch_pages = {}, patch_providers = {} } = parsed

  // Write directly to live tables — WhatsApp = authenticated by phone, so auto-publish
  if (Object.keys(patch_pages).length > 0) {
    await supabaseAdmin.from('pages').update(patch_pages).eq('provider_id', provider.id)
  }

  const allowed = ['location', 'whatsapp_number']
  const safeProviders = Object.fromEntries(
    Object.entries(patch_providers).filter(([k]) => allowed.includes(k))
  )
  if (Object.keys(safeProviders).length > 0) {
    await supabaseAdmin.from('providers').update(safeProviders).eq('id', provider.id)
  }

  if (Object.keys(patch_pages).length > 0 || Object.keys(safeProviders).length > 0) {
    revalidatePath(`/${provider.slug}`)
  }

  await sendWhatsAppMessage({ to: senderPhone, text: message })
}

// Mirrors the publish route — applies draft_data to live tables and clears it
async function applyDraftAndPublish(providerId: string, slug: string) {
  const { data: pageRow } = await supabaseAdmin
    .from('pages')
    .select('draft_data')
    .eq('provider_id', providerId)
    .single()

  type DraftShape = { pages?: Record<string, unknown>; providers?: Record<string, unknown> }
  const draft = (pageRow?.draft_data ?? {}) as DraftShape
  const dp  = draft.pages     ?? {}
  const dpr = draft.providers ?? {}

  if (Object.keys(dp).length > 0) {
    await supabaseAdmin.from('pages').update(dp).eq('provider_id', providerId)
  }

  const allowed = ['location', 'whatsapp_number']
  const safe = Object.fromEntries(Object.entries(dpr).filter(([k]) => allowed.includes(k)))
  if (Object.keys(safe).length > 0) {
    await supabaseAdmin.from('providers').update(safe).eq('id', providerId)
  }

  await supabaseAdmin.from('pages').update({ draft_data: null }).eq('provider_id', providerId)
  revalidatePath(`/${slug}`)
}
