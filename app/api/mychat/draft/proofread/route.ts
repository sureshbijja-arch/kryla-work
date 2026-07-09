/**
 * POST /api/mychat/draft/proofread
 *
 * Automated proofreading & legal polish for the Drafting Studio.
 * Returns a structured JSON array of findings with exact excerpts for
 * inline highlighting in the TipTap editor.
 *
 * Body: { providerId, draftBody }
 * Returns: { findings: ProofreadFinding[] }
 *
 * Gated under the shared 'drafting' feature key (Thrive+).
 * Increments shared drafting_usage counter.
 */

import { createClient }         from '@/lib/supabase/server'
import { supabaseAdmin }        from '@/lib/supabase/admin'
import { getPlanGate }          from '@/lib/plans'
import { buildProofreadPrompt } from '@/lib/researchPrompt'
import Anthropic                from '@anthropic-ai/sdk'
import { NextResponse }         from 'next/server'

const anthropic   = new Anthropic({ maxRetries: 2 })
const DAILY_LIMIT = parseInt(process.env.DRAFTING_DAILY_LIMIT ?? '20', 10)

export const maxDuration = 60

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body      = await req.json()
  const { providerId, draftBody } = body as { providerId: string; draftBody: string }

  if (!providerId || !draftBody?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // ── Ownership ─────────────────────────────────────────────────────────────
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email, persona, location, plan')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  if (provider.persona !== 'advocate') {
    return NextResponse.json({ error: 'Proofread is for the advocate persona only.' }, { status: 403 })
  }

  // ── Plan gate ─────────────────────────────────────────────────────────────
  const gate = await getPlanGate()
  if (!gate.allows('drafting', provider.plan ?? 'grow')) {
    return NextResponse.json({ error: 'Thrive plan required.' }, { status: 403 })
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
      error: `Daily limit of ${DAILY_LIMIT} reached. Resets at midnight UTC.`,
    }, { status: 429 })
  }

  // ── Strip HTML to plain text for excerpt matching (keep HTML for reference) ─
  const plainText = draftBody
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // ── Anthropic call ────────────────────────────────────────────────────────
  const systemPrompt = buildProofreadPrompt(provider.location ?? 'India')

  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      system:     systemPrompt,
      messages:   [{
        role: 'user',
        content: `Please proofread the following legal document and return a JSON array of findings:

---
${plainText}
---`,
      }],
    })

    const raw = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()

    // Safely parse — model should return bare JSON
    let findings: unknown[] = []
    const match = raw.match(/\[[\s\S]*\]/)
    if (match) {
      try { findings = JSON.parse(match[0]) } catch { findings = [] }
    }

    // Increment usage (non-fatal)
    supabaseAdmin
      .from('drafting_usage')
      .upsert(
        { provider_id: providerId, day_key: dayKey, count: (usageRow?.count ?? 0) + 1 },
        { onConflict: 'provider_id,day_key' },
      )
      .then(() => {})

    return NextResponse.json({ findings })
  } catch (err) {
    console.error('[proofread] Anthropic call failed:', err)
    return NextResponse.json({ error: 'Proofreading failed — please try again.' }, { status: 502 })
  }
}
