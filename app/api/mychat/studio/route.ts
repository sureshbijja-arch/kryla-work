/**
 * POST /api/mychat/studio
 *
 * Config-driven Practitioner Studio — AI clinical documentation endpoint.
 * Replaces /api/mychat/working (physio-only) with a persona-agnostic route
 * driven by studio_archetypes + studio_modes in Supabase.
 *
 * PRIMARY MODES (driven by studio_modes.key for the persona's archetype):
 *   Each archetype has its own mode set, loaded from DB.
 *   User message = form values (from form_schema) + mode.prompt_instructions.
 *
 * EDITOR ACTIONS (shared across all archetypes, handled generically):
 *   'continue'          — continue writing from cursor position (SSE stream)
 *   'rewrite'           — rewrite selected text, preserve meaning
 *   'simplify'          — simplify to plain patient/client-readable language
 *   'explain'           — explain the selected clinical/professional text
 *   'brainstorm'        — generate ideas for the current document context (SSE stream)
 *   'completeness_check'— audit document completeness (JSON array)
 *
 * Streaming: 'continue' and 'brainstorm' return SSE (text/event-stream).
 * All others return { message: string } JSON.
 *
 * System prompt = archetypes.base_guidance + personas.studio_guidance.
 * User message  = form values formatted from form_schema + mode.prompt_instructions.
 *
 * Plan gate: feature_key from studio_config → archetype (default 'studio').
 * Rate limit: studio_usage table, STUDIO_DAILY_LIMIT env var (default 20).
 */

import { createClient }                 from '@/lib/supabase/server'
import { supabaseAdmin }                from '@/lib/supabase/admin'
import { getPlanGate }                  from '@/lib/plans'
import { getPersonaStudioConfig }       from '@/lib/personas'
import { buildStudioSystemPrompt, buildCompletenessCheckPrompt } from '@/lib/researchPrompt'
import Anthropic                        from '@anthropic-ai/sdk'
import { NextResponse }                 from 'next/server'

const anthropic   = new Anthropic({ maxRetries: 2 })
const DAILY_LIMIT = parseInt(process.env.STUDIO_DAILY_LIMIT ?? '20', 10)

export const maxDuration = 60

const STREAMING_ACTIONS = new Set(['continue', 'brainstorm'])

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    providerId,
    mode,           // primary mode key: 'assess' | 'note' | 'plan' | 'program' | 'report' | 'refine' | archetype-specific
    action,         // editor action: 'continue' | 'rewrite' | 'simplify' | 'explain' | 'brainstorm' | 'completeness_check'
    formValues,     // Record<string, string> — field id → value from the dynamic form
    docBody,        // current document HTML (for editor actions and refine)
    selectedHtml,   // selected text for bubble menu actions
    docTypeHint,    // document type context hint for completeness_check / brainstorm
  } = body as {
    providerId:   string
    mode?:        string
    action?:      string
    formValues?:  Record<string, string>
    docBody?:     string
    selectedHtml?: string
    docTypeHint?: string
  }

  const effectiveMode = mode ?? action ?? ''

  if (!providerId || !effectiveMode) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // ── Ownership ─────────────────────────────────────────────────────────────
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email, first_name, persona, location, plan')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // ── Load studio config ────────────────────────────────────────────────────
  // For editor actions we still need the archetype for the system prompt.
  const studioConfig = await getPersonaStudioConfig(provider.persona)
  if (!studioConfig) {
    return NextResponse.json({
      error: 'No studio configured for this persona.',
    }, { status: 403 })
  }

  const { persona: personaRow, archetype, modes } = studioConfig

  // ── Plan gate ─────────────────────────────────────────────────────────────
  const featureKey = (personaRow.studio_config?.feature_key as string) ?? archetype.feature_key ?? 'studio'
  const gate       = await getPlanGate()
  if (!gate.allows(featureKey, provider.plan ?? 'grow')) {
    return NextResponse.json({
      message: 'The Practitioner Studio is available on the Thrive plan and above. Upgrade in My Plan to unlock it.',
    })
  }

  // ── Daily rate limit ──────────────────────────────────────────────────────
  const dayKey = new Date().toISOString().split('T')[0]
  const { data: usageRow } = await supabaseAdmin
    .from('studio_usage')
    .select('count')
    .eq('provider_id', providerId)
    .eq('day_key', dayKey)
    .maybeSingle()

  if ((usageRow?.count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({
      message: `You've used all ${DAILY_LIMIT} Studio generations for today. They reset at midnight UTC.`,
    })
  }

  // ── Build system prompt ───────────────────────────────────────────────────
  const isEditorAction = !!action && !mode

  const systemPrompt = effectiveMode === 'completeness_check'
    ? buildCompletenessCheckPrompt()
    : buildStudioSystemPrompt({
        name:           provider.first_name ?? 'there',
        persona:        provider.persona,
        location:       provider.location ?? '',
        baseGuidance:   archetype.base_guidance,
        studioGuidance: personaRow.studio_guidance ?? '',
      })

  // ── Build user message ────────────────────────────────────────────────────
  let userMessage = ''

  if (isEditorAction) {
    // Generic editor actions — same for all archetypes
    userMessage = buildEditorActionMessage(effectiveMode, {
      docBody:      docBody ?? '',
      selectedHtml: selectedHtml ?? '',
      docTypeHint:  docTypeHint  ?? '',
      persona:      provider.persona,
    })
  } else {
    // Primary mode — load from DB, build from form values
    const modeRow = modes.find(m => m.key === effectiveMode)
    if (!modeRow) {
      return NextResponse.json({ error: `Unknown mode: ${effectiveMode}` }, { status: 400 })
    }
    userMessage = buildPrimaryModeMessage(modeRow, formValues ?? {}, docBody ?? '')
  }

  if (!userMessage.trim()) {
    return NextResponse.json({ error: 'No content to generate from' }, { status: 400 })
  }

  // ── Increment usage counter ───────────────────────────────────────────────
  await supabaseAdmin
    .from('studio_usage')
    .upsert({ provider_id: providerId, day_key: dayKey, count: (usageRow?.count ?? 0) + 1 })

  // ── Streaming actions ─────────────────────────────────────────────────────
  if (STREAMING_ACTIONS.has(effectiveMode)) {
    const stream = await anthropic.messages.stream({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    })

    const encoder  = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: chunk.delta.text })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection':    'keep-alive',
      },
    })
  }

  // ── Non-streaming ─────────────────────────────────────────────────────────
  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 4096,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userMessage }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ message: text })
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Build a user message for a primary studio mode.
 * Formats each form field value from the form_schema, then appends the
 * mode's prompt_instructions as the generation directive.
 */
function buildPrimaryModeMessage(
  modeRow: { key: string; label: string; form_schema: Array<{ id: string; label: string; type: string }> | null; prompt_instructions: string },
  formValues: Record<string, string>,
  docBody: string,
): string {
  const schema = (modeRow.form_schema ?? []) as Array<{ id: string; label: string; type: string }>

  // Refine mode gets the current document as context
  if (modeRow.key === 'refine' && docBody) {
    const instruction = formValues['instruction']?.trim() || ''
    return `MODE: REFINE

CURRENT DOCUMENT:
${docBody}

REFINEMENT INSTRUCTION:
${instruction || 'Improve the document.'}

${modeRow.prompt_instructions}`
  }

  // Report mode — no form fields, just the prompt instruction
  if (modeRow.key === 'report') {
    const reportLabel = formValues['report_type'] ?? 'report'
    const fields = Object.entries(formValues)
      .filter(([k, v]) => k !== 'report_type' && v?.trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    return `MODE: REPORT

REPORT TYPE: ${reportLabel}

${fields ? `TEMPLATE FIELDS:\n${fields}\n\n` : ''}${modeRow.prompt_instructions}`
  }

  // General primary modes — format each field
  const fieldLines = schema
    .filter(f => f.type !== 'library')
    .map(f => {
      const val = formValues[f.id]?.trim()
      return val ? `${f.label.toUpperCase()}:\n${val}` : null
    })
    .filter(Boolean)
    .join('\n\n')

  // Library items formatted separately
  const libraryRaw = formValues['library_items']
  let librarySection = ''
  if (libraryRaw) {
    try {
      const items = JSON.parse(libraryRaw) as Array<{
        name: string; instructions?: string; meta?: Record<string, unknown>
      }>
      if (items.length > 0) {
        librarySection = `\n\nPROGRAM ITEMS:\n` + items.map((item, i) => {
          const meta = item.meta ?? {}
          const details = [
            meta.default_sets   ? `Sets: ${meta.default_sets}` : null,
            meta.default_reps   ? `Reps: ${meta.default_reps}` : null,
            meta.default_hold   ? `Hold: ${meta.default_hold}s` : null,
            meta.default_duration ? `Duration: ${meta.default_duration}` : null,
          ].filter(Boolean).join(' · ')
          return `${i + 1}. ${item.name}${details ? ` (${details})` : ''}\n${item.instructions ?? ''}`
        }).join('\n\n')
      }
    } catch { /* ignore parse errors */ }
  }

  return `MODE: ${modeRow.key.toUpperCase()}

${fieldLines}${librarySection}

${modeRow.prompt_instructions}`
}

/**
 * Build a user message for a shared editor action (applies to all archetypes).
 */
function buildEditorActionMessage(
  action: string,
  ctx: { docBody: string; selectedHtml: string; docTypeHint: string; persona: string },
): string {
  switch (action) {

    case 'continue':
      return `Continue writing the following clinical document from where it ends. Maintain the same style, format, and clinical tone. Return ONLY the continuation as valid HTML — no preamble, no explanation.

DOCUMENT SO FAR:
${ctx.docBody}`

    case 'rewrite':
      return `Rewrite the following selected text. Preserve the clinical meaning exactly — improve clarity, professional tone, and flow only. Return ONLY the rewritten HTML fragment — no preamble.

SELECTED TEXT:
${ctx.selectedHtml}`

    case 'simplify':
      return `Rewrite the following selected text in plain, patient-friendly English. Remove clinical jargon. Keep it accurate but easy to understand for a layperson. Return ONLY the simplified HTML — no preamble.

SELECTED TEXT:
${ctx.selectedHtml}`

    case 'explain':
      return `Explain the following selected clinical/professional text in plain English. What does it mean? Why is it clinically or professionally significant? Return as a concise HTML paragraph.

SELECTED TEXT:
${ctx.selectedHtml}`

    case 'brainstorm':
      return `Brainstorm ideas related to the current document${ctx.docTypeHint ? ` (${ctx.docTypeHint})` : ''}. Generate 5–8 practical, evidence-informed ideas relevant to the content below. Format as an HTML bulleted list.

CURRENT DOCUMENT:
${ctx.docBody}`

    case 'completeness_check':
      return `${ctx.docBody}`

    default:
      return ctx.docBody || ctx.selectedHtml
  }
}
