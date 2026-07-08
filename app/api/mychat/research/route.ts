/**
 * POST /api/mychat/research
 *
 * Persona-scoped business research powered by Anthropic's native web_search tool.
 * Separate from /api/mychat/chat so the strict JSON-patch contract there is untouched.
 * Returns { message: string; sources: { title: string; url: string }[] }
 *
 * Gated: feature_key 'research' (add to plan_features for Thrive+ in /admin/plans).
 * Rate-limited: RESEARCH_DAILY_LIMIT calls/day per member (default 10).
 */

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPlanGate } from '@/lib/plans'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

const DAILY_LIMIT = parseInt(process.env.RESEARCH_DAILY_LIMIT ?? '10', 10)

// ── Location helpers ────────────────────────────────────────────────────────
// Derive an approximate ISO country code from a free-text location string.
// Best-effort — Whisper auto-detect handles edge cases.
function inferCountry(location: string): string {
  const l = location.toLowerCase()
  if (l.includes('india') || /\b(delhi|mumbai|bangalore|bengaluru|chennai|hyderabad|kolkata|pune|ahmedabad|jaipur|surat)\b/.test(l)) return 'IN'
  if (l.includes('united kingdom') || l.includes(' uk') || l.includes('england') || l.includes('london') || l.includes('scotland') || l.includes('wales')) return 'GB'
  if (l.includes('canada') || l.includes('toronto') || l.includes('vancouver') || l.includes('montreal')) return 'CA'
  if (l.includes('australia') || l.includes('sydney') || l.includes('melbourne') || l.includes('brisbane')) return 'AU'
  return 'US' // default
}

// Extract a city-like string from the location (first segment before comma or state abbr)
function inferCity(location: string): string {
  return location.split(',')[0].trim()
}

// ── Persona display ─────────────────────────────────────────────────────────
const PERSONA_LABEL: Record<string, string> = {
  tutor: 'tutor', trainer: 'personal trainer', baker: 'baker/pastry chef',
  photographer: 'photographer', salon: 'salon/beauty professional',
  chef: 'private chef', doctor: 'healthcare professional',
  musician: 'musician/music teacher', other: 'professional',
}

function personaLabel(persona: string, customName?: string | null): string {
  if (persona === 'other' && customName) return customName
  return PERSONA_LABEL[persona] ?? persona
}

// ── System prompt ───────────────────────────────────────────────────────────
function buildSystemPrompt(opts: {
  name: string
  persona: string
  customPersona?: string | null
  location: string
  services: string
}): string {
  const role = personaLabel(opts.persona, opts.customPersona)
  const today = new Date().toISOString().split('T')[0]

  const guardrail = opts.persona === 'doctor'
    ? '\n\nIMPORTANT: This is a healthcare professional. NEVER give medical advice, diagnoses, or treatment recommendations. Limit research strictly to business topics (marketing, pricing, patient experience, practice management).'
    : ''

  return `You are a business intelligence assistant for ${opts.name}, a ${role} based in ${opts.location} on the Kryla platform.

TODAY: ${today}

Their services: ${opts.services || 'not specified'}

Your job: use web search to answer their business-related questions with concrete, actionable insights scoped to their niche and location. Always:
- Search before answering — ground every claim in real sources
- Give 3–5 specific, actionable ideas relevant to a ${role} in ${opts.location}
- Frame everything as "ideas to consider" or "what others in your field are doing" — not definitive facts
- Mention 1-2 specific sources by name (e.g. "According to WeddingWire…")
- Keep the tone warm and practical — like a knowledgeable friend, not a consultant
- End with one concrete next step they can take in My Chat (e.g. "Want me to add X as a service?")
- Never mention "AI" — you are Kryla${guardrail}`
}

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
  return sources.slice(0, 5) // cap at 5 sources
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

  // ── Anthropic web_search call ─────────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (anthropic as any).messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: buildSystemPrompt({
          name: provider.first_name ?? 'there',
          persona: provider.persona ?? 'other',
          customPersona: provider.custom_persona_name,
          location: location || 'your area',
          services,
        }),
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
