/**
 * POST /api/mychat/research
 *
 * Persona-aware co-pilot powered by Anthropic's native web_search tool.
 * Handles BOTH profession-specific help (teaching, craft, coaching) and
 * business research (pricing, marketing, demand). The old "business-only"
 * restriction is removed — the shared buildResearchSystemPrompt handles scope.
 *
 * Separate from /api/mychat/chat so the strict JSON-patch contract there is untouched.
 * Returns { message: string; sources: { title: string; url: string }[] }
 *
 * Gated: feature_key 'research' (add to plan_features for Thrive+ in /admin/plans).
 * Rate-limited: RESEARCH_DAILY_LIMIT calls/day per member (default 10).
 */

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlanGate } from '@/lib/plans'
import { buildResearchSystemPrompt, inferCity, inferCountry } from '@/lib/researchPrompt'
import { getVertical } from '@/config/verticals'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

const DAILY_LIMIT = parseInt(process.env.RESEARCH_DAILY_LIMIT ?? '10', 10)

// ── Source extraction ───────────────────────────────────────────────────────
interface Source { title: string; url: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSources(content: any[]): Source[] {
  const sources: Source[] = []
  const seen = new Set<string>()
  for (const block of content) {
    if (block.type === 'web_search_tool_result') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of (block.content ?? []) as any[]) {
        const url: string = item.url ?? ''
        if (url && !seen.has(url)) {
          seen.add(url)
          sources.push({ title: item.title ?? url, url })
        }
      }
    }
  }
  return sources.slice(0, 5)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(content: any[]): string {
  return content
    .filter(b => b.type === 'text')
    .map(b => b.text as string)
    .join('\n')
    .trim()
}

// ── Route ───────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, messages } = body as {
    providerId: string
    messages: { role: 'user' | 'assistant'; content: string }[]
  }

  if (!providerId || !messages?.length) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // ── Ownership ─────────────────────────────────────────────────────────────
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email, first_name, persona, custom_persona_name, location, plan')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // ── Plan gate ─────────────────────────────────────────────────────────────
  const gate = await getPlanGate()
  if (!gate.allows('research', provider.plan ?? 'grow')) {
    return NextResponse.json({
      message: "Research is available on the Thrive plan and above. Upgrade in My Plan to unlock persona-scoped business intelligence.",
      sources: [],
    })
  }

  // ── Daily rate limit ──────────────────────────────────────────────────────
  const dayKey = new Date().toISOString().split('T')[0]
  const { data: usageRow } = await supabaseAdmin
    .from('research_usage')
    .select('count')
    .eq('provider_id', providerId)
    .eq('day_key', dayKey)
    .maybeSingle()

  if ((usageRow?.count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json({
      message: `You've used all ${DAILY_LIMIT} research searches for today. They reset at midnight UTC — or just ask me to update your page directly!`,
      sources: [],
    })
  }

  // ── Fetch services for context ────────────────────────────────────────────
  const { data: page } = await supabaseAdmin
    .from('pages')
    .select('services')
    .eq('provider_id', providerId)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const services = ((page?.services ?? []) as any[]).map((s: any) => s.name).join(', ')

  // ── Build location context for web_search user_location ──────────────────
  const location = provider.location ?? ''
  const userLocation = location
    ? { type: 'approximate' as const, city: inferCity(location), country: inferCountry(location) }
    : undefined

  // ── Build co-pilot system prompt ──────────────────────────────────────────
  const vertical = getVertical(provider.persona ?? '')
  const systemPrompt = buildResearchSystemPrompt({
    name:         provider.first_name ?? 'there',
    persona:      provider.persona ?? 'other',
    customPersona: provider.custom_persona_name,
    location:     location || 'your area',
    services,
    guidance:     vertical?.researchGuidance,
    concise:      false,
  })

  // ── Anthropic web_search call ─────────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (anthropic as any).messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 3,
            ...(userLocation ? { user_location: userLocation } : {}),
          },
        ],
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      },
      { headers: { 'anthropic-beta': 'web-search-2025-03-05' } },
    )

    const content = response.content ?? []
    const message = extractText(content)
    const sources = extractSources(content)

    // ── Increment usage counter (non-fatal) ──────────────────────────────
    supabaseAdmin
      .from('research_usage')
      .upsert(
        { provider_id: providerId, day_key: dayKey, count: (usageRow?.count ?? 0) + 1 },
        { onConflict: 'provider_id,day_key' },
      )
      .then(() => {/* fire-and-forget */})

    return NextResponse.json({ message, sources })
  } catch (err) {
    console.error('[research] Anthropic web_search failed:', err)
    return NextResponse.json(
      { error: 'Research failed — please try again.', message: 'Research failed — please try again.', sources: [] },
      { status: 502 },
    )
  }
}
