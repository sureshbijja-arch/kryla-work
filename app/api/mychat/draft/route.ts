/**
 * POST /api/mychat/draft
 *
 * Advocate Drafting Studio — AI generation endpoint.
 * Supports three modes:
 *   'draft'  — generate a full document from doc_type + facts
 *   'review' — analyse a pasted draft for risks / missing clauses
 *   'refine' — rewrite / improve an existing draft per instruction
 *
 * Gated: feature_key 'drafting' (add to plan_features for Thrive+ in /admin/plans).
 * Rate-limited: DRAFTING_DAILY_LIMIT calls/day per member (default 20).
 *
 * Returns { message: string }
 */

import { createClient }           from '@/lib/supabase/server'
import { supabaseAdmin }          from '@/lib/supabase/admin'
import { getPlanGate }            from '@/lib/plans'
import { buildDraftingSystemPrompt } from '@/lib/researchPrompt'
import { getVertical }              from '@/config/verticals'
import Anthropic                  from '@anthropic-ai/sdk'
import { NextResponse }           from 'next/server'

const anthropic  = new Anthropic({ maxRetries: 2 })
const DAILY_LIMIT = parseInt(process.env.DRAFTING_DAILY_LIMIT ?? '20', 10)

export const maxDuration = 60

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    providerId,
    mode,           // 'draft' | 'review' | 'refine'
    docType,        // e.g. 'legal_notice'  (draft mode)
    docLabel,       // human label, e.g. 'Legal Notice'
    facts,          // Record<string, string> — fact form answers (draft mode)
    draftBody,      // existing body text (review / refine modes)
    instruction,    // refinement instruction (refine mode)
  } = body as {
    providerId: string
    mode: 'draft' | 'review' | 'refine'
    docType?: string
    docLabel?: string
    facts?: Record<string, string>
    draftBody?: string
    instruction?: string
  }

  if (!providerId || !mode) {
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
    mode,
  })

  // ── Build user message ────────────────────────────────────────────────────
  let userMessage = ''

  if (mode === 'draft') {
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

Please generate a complete, well-structured ${docLabel ?? docType} based on the facts above. Follow standard Indian legal formatting.`
  }

  else if (mode === 'review') {
    if (!draftBody?.trim()) {
      return NextResponse.json({ error: 'Missing draftBody for review mode' }, { status: 400 })
    }
    userMessage = `MODE: REVIEW
Please analyse the following draft for risks, missing clauses, and improvement opportunities:

---
${draftBody}
---`
  }

  else if (mode === 'refine') {
    if (!draftBody?.trim() || !instruction?.trim()) {
      return NextResponse.json({ error: 'Missing draftBody or instruction for refine mode' }, { status: 400 })
    }
    userMessage = `MODE: REFINE
Instruction: ${instruction}

Current draft:
---
${draftBody}
---

Please apply the instruction and return the complete revised draft.`
  }

  else {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  // ── Anthropic call ────────────────────────────────────────────────────────
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

    // ── Increment usage counter (non-fatal) ────────────────────────────────
    supabaseAdmin
      .from('drafting_usage')
      .upsert(
        { provider_id: providerId, day_key: dayKey, count: (usageRow?.count ?? 0) + 1 },
        { onConflict: 'provider_id,day_key' },
      )
      .then(() => {/* fire-and-forget */})

    return NextResponse.json({ message })
  } catch (err) {
    console.error('[draft] Anthropic call failed:', err)
    return NextResponse.json(
      { error: 'Generation failed — please try again.', message: 'Generation failed — please try again.' },
      { status: 502 },
    )
  }
}
