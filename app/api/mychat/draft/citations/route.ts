/**
 * POST /api/mychat/draft/citations
 *
 * Citation verification & formatting for the Drafting Studio.
 * Extracts citations from the draft, verifies them via web search,
 * returns structured results for inline flagging in the TipTap editor.
 *
 * This is the ONLY drafting endpoint that uses the web_search tool.
 *
 * Body: { providerId, draftBody }
 * Returns: { citations: Citation[] }
 *
 * Gated under the shared 'drafting' feature key (Thrive+).
 * Increments shared drafting_usage counter.
 */

import { createClient }          from '@/lib/supabase/server'
import { supabaseAdmin }         from '@/lib/supabase/admin'
import { getPlanGate }           from '@/lib/plans'
import { buildCitationPrompt }   from '@/lib/researchPrompt'
import Anthropic                 from '@anthropic-ai/sdk'
import { NextResponse }          from 'next/server'

const anthropic   = new Anthropic({ maxRetries: 2 })
const DAILY_LIMIT = parseInt(process.env.DRAFTING_DAILY_LIMIT ?? '20', 10)

export const maxDuration = 60

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
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
    return NextResponse.json({ error: 'Citation check is for the advocate persona only.' }, { status: 403 })
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

  // ── Plain text for excerpt matching ───────────────────────────────────────
  const plainText = draftBody
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // ── Anthropic call with web_search ────────────────────────────────────────
  const systemPrompt = buildCitationPrompt(provider.location ?? 'India')

  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      system:     systemPrompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
      messages: [{
        role: 'user',
        content: `Please extract and verify all legal citations in the following document:

---
${plainText}
---

Use web search to verify each citation. Return ONLY a JSON array.`,
      }],
    })

    // Extract the final text block (after any tool use)
    const raw = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()

    let citations: unknown[] = []
    const match = raw.match(/\[[\s\S]*\]/)
    if (match) {
      try { citations = JSON.parse(match[0]) } catch { citations = [] }
    }

    // Increment usage (non-fatal)
    supabaseAdmin
      .from('drafting_usage')
      .upsert(
        { provider_id: providerId, day_key: dayKey, count: (usageRow?.count ?? 0) + 1 },
        { onConflict: 'provider_id,day_key' },
      )
      .then(() => {})

    return NextResponse.json({ citations })
  } catch (err) {
    console.error('[citations] Anthropic call failed:', err)
    return NextResponse.json({ error: 'Citation check failed — please try again.' }, { status: 502 })
  }
}
