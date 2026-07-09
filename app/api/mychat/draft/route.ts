/**
 * POST /api/mychat/draft
 *
 * Advocate Drafting Studio — AI generation endpoint.
 *
 * Modes (original):
 *   'draft'   — generate a full document from doc_type + facts
 *   'review'  — analyse a pasted draft for risks / missing clauses
 *   'refine'  — rewrite / improve an existing draft per instruction
 *
 * Actions (new — used by editor bubble menu and slash commands):
 *   'continue'        — continue writing from cursor context (SSE stream)
 *   'rewrite'         — rewrite selected text, same meaning
 *   'firmer'          — make selected text more assertive
 *   'simplify'        — simplify selected text into plain English
 *   'explain'         — explain the selected text legally
 *   'brainstorm'      — generate arguments / alternative approaches (SSE stream)
 *   'suggest_clauses' — suggest missing clauses as JSON array
 *
 * Streaming: 'continue' and 'brainstorm' return SSE (text/event-stream).
 * All others return { message: string } JSON.
 *
 * Gated: feature_key 'drafting' (Thrive+ in /admin/plans).
 * Rate-limited: DRAFTING_DAILY_LIMIT calls/day per member (default 20).
 * All AI calls increment the shared drafting_usage counter.
 */

import { createClient }              from '@/lib/supabase/server'
import { supabaseAdmin }             from '@/lib/supabase/admin'
import { getPlanGate }               from '@/lib/plans'
import { buildDraftingSystemPrompt } from '@/lib/researchPrompt'
import { getVertical }               from '@/config/verticals'
import Anthropic                     from '@anthropic-ai/sdk'
import { NextResponse }              from 'next/server'

const anthropic  = new Anthropic({ maxRetries: 2 })
const DAILY_LIMIT = parseInt(process.env.DRAFTING_DAILY_LIMIT ?? '20', 10)

export const maxDuration = 60

// ── SSE-streaming actions ─────────────────────────────────────────────────────
const STREAMING_ACTIONS = new Set(['continue', 'brainstorm'])

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    providerId,
    mode,           // original: 'draft' | 'review' | 'refine'
    action,         // new: 'continue' | 'rewrite' | 'firmer' | 'simplify' | 'explain' | 'brainstorm' | 'suggest_clauses'
    docType,
    docLabel,
    facts,
    draftBody,
    instruction,
    selectedHtml,   // for bubble menu actions — the selected text (HTML)
    docTypeHint,    // for suggest_clauses — doc_type to give the AI context
  } = body as {
    providerId:   string
    mode?:        string
    action?:      string
    docType?:     string
    docLabel?:    string
    facts?:       Record<string, string>
    draftBody?:   string
    instruction?: string
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
  if (provider.persona !== 'advocate') {
    return NextResponse.json({ error: 'Drafting Studio is for the advocate persona only.' }, { status: 403 })
  }

  // ── Plan gate ─────────────────────────────────────────────────────────────
  const gate = await getPlanGate()
  if (!gate.allows('drafting', provider.plan ?? 'grow')) {
    return NextResponse.json({
      message: "The Drafting Studio is available on the Thrive plan and above. Upgrade in My Plan to unlock it.",
    })
  }

  // ── Daily rate limit ──────────────────────────────────────────────────────
  const dayKey = new Date().toISOString().split('T')[0]
  const { data: usageRow } = await supabaseAdmin
    .from('drafting_usage')
    .select('count')
    .eq('provider_id', providerId)
    .eq('day_key', dayKey)
    .maybeSingle()

  if ((usageRow?.count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({
      message: `You've used all ${DAILY_LIMIT} drafting generations for today. They reset at midnight UTC.`,
    })
  }

  // ── Build system prompt ───────────────────────────────────────────────────
  const vertical = getVertical(provider.persona)
  const systemPrompt = buildDraftingSystemPrompt({
    name:             provider.first_name ?? 'there',
    persona:          provider.persona ?? 'advocate',
    location:         provider.location ?? 'India',
    draftingGuidance: vertical?.draftingGuidance ?? '',
    mode:             effectiveMode,
  })

  // ── Build user message ────────────────────────────────────────────────────
  let userMessage = ''

  switch (effectiveMode) {
    // ── Original modes ───────────────────────────────────────────────────────
    case 'draft': {
      if (!docType || !facts) {
        return NextResponse.json({ error: 'Missing docType or facts for draft mode' }, { status: 400 })
      }
      const factsText = Object.entries(facts)
        .filter(([, v]) => v?.trim())
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')

      userMessage = `MODE: DRAFT
Document type: ${docLabel ?? docType}

FACTS PROVIDED:
${factsText}

Please generate a complete, well-structured ${docLabel ?? docType} based on the facts above. Follow standard Indian legal formatting. Return as valid HTML (use <h1>–<h3>, <p>, <strong>, <ul>/<li>) — no markdown.`
      break
    }

    case 'review': {
      if (!draftBody?.trim()) {
        return NextResponse.json({ error: 'Missing draftBody for review mode' }, { status: 400 })
      }
      userMessage = `MODE: REVIEW
Please analyse the following draft for risks, missing clauses, and improvement opportunities:

---
${draftBody}
---`
      break
    }

    case 'refine': {
      if (!draftBody?.trim() || !instruction?.trim()) {
        return NextResponse.json({ error: 'Missing draftBody or instruction for refine mode' }, { status: 400 })
      }
      userMessage = `MODE: REFINE
Instruction: ${instruction}

Current draft:
---
${draftBody}
---

Please apply the instruction and return the complete revised draft as valid HTML (use <h1>–<h3>, <p>, <strong>, <ul>/<li>) — no markdown.`
      break
    }

    // ── Bubble menu / slash actions ───────────────────────────────────────────
    case 'continue': {
      const context = draftBody ?? selectedHtml ?? ''
      userMessage = `MODE: CONTINUE
Continue writing the following legal document from where it ends. Maintain the same style, tone, register, and formatting. Return only the continuation (no repeated content) as valid HTML.

Current document:
---
${context}
---`
      break
    }

    case 'rewrite': {
      const text = selectedHtml ?? draftBody ?? ''
      userMessage = `MODE: REWRITE
Rewrite the following text while preserving its legal meaning and intent. Improve clarity and structure. Return ONLY the rewritten text as a valid HTML fragment (no surrounding document structure). No preamble.

Text:
---
${text}
---`
      break
    }

    case 'firmer': {
      const text = selectedHtml ?? draftBody ?? ''
      userMessage = `MODE: FIRMER
Make the following legal text more assertive, firm, and unambiguous. Strengthen the language without changing the substance. Return ONLY the revised text as a valid HTML fragment. No preamble.

Text:
---
${text}
---`
      break
    }

    case 'simplify': {
      const text = selectedHtml ?? draftBody ?? ''
      userMessage = `MODE: SIMPLIFY
Rewrite the following legal text in plain English that a non-lawyer can understand, while preserving all legal obligations and rights. Return ONLY the simplified text as a valid HTML fragment. No preamble.

Text:
---
${text}
---`
      break
    }

    case 'explain': {
      const text = selectedHtml ?? draftBody ?? ''
      userMessage = `MODE: EXPLAIN
Explain what the following legal text means in plain English. Include: (a) what rights/obligations it creates, (b) any risks or pitfalls for your client, and (c) any jurisdiction-specific notes relevant to Indian law. Return as HTML with <p> paragraphs and <ul>/<li> bullet points.

Text:
---
${text}
---`
      break
    }

    case 'brainstorm': {
      const context = draftBody ?? selectedHtml ?? ''
      userMessage = `MODE: BRAINSTORM
Based on the following document context, generate legal arguments, alternative approaches, or strategic points that the advocate might consider. Be specific and practical. Return as HTML with <p> paragraphs and <ul>/<li> lists.

Context:
---
${context}
---`
      break
    }

    case 'suggest_clauses': {
      const docContent = draftBody ?? ''
      userMessage = `MODE: SUGGEST_CLAUSES
Document type: ${docTypeHint ?? 'unknown'}

Analyse the following document and suggest standard clauses that appear to be missing or incomplete. Consider: dispute resolution, jurisdiction, indemnity, confidentiality, force majeure, termination, limitation of liability, notice provisions, and any document-type-specific clauses.

Current document:
---
${docContent}
---

Return ONLY a valid JSON array. Each item: {"category":"...","title":"...","reason":"..."} — no markdown, no explanation.`
      break
    }

    default:
      return NextResponse.json({ error: 'Invalid mode/action' }, { status: 400 })
  }

  // ── Anthropic call ────────────────────────────────────────────────────────
  const incrementUsage = () => {
    supabaseAdmin
      .from('drafting_usage')
      .upsert(
        { provider_id: providerId, day_key: dayKey, count: (usageRow?.count ?? 0) + 1 },
        { onConflict: 'provider_id,day_key' },
      )
      .then(() => {/* fire-and-forget */})
  }

  // SSE streaming for long-form generation (continue, brainstorm)
  if (STREAMING_ACTIONS.has(effectiveMode)) {
    const stream = anthropic.messages.stream({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ token: chunk.delta.text })}\n\n`)
              )
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch {
          controller.enqueue(encoder.encode('data: [ERROR]\n\n'))
        } finally {
          controller.close()
          incrementUsage()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      },
    })
  }

  // Non-streaming (all other modes)
  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    })

    const message = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim()

    incrementUsage()
    return NextResponse.json({ message })
  } catch (err) {
    console.error('[draft] Anthropic call failed:', err)
    return NextResponse.json(
      { error: 'Generation failed — please try again.', message: 'Generation failed — please try again.' },
      { status: 502 },
    )
  }
}
