/**
 * GET /api/mychat/legal-news
 *
 * Returns cached LiveLaw RSS items for India-region advocate members.
 *
 * Gating (data-driven from system_config.livelaw_feed):
 *   - enabled: false  → 200 { items: [] }
 *   - persona  not in gating.personas → 200 { items: [] }
 *   - region   not in gating.regions  → 200 { items: [] }
 *
 * Returns latest max_items rows from legal_news, ordered by published_at DESC.
 *
 * Auth: SSR session (same pattern as /api/mychat/research).
 * Query param: providerId (required)
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'

interface LiveLawConfig {
  enabled: boolean
  max_items: number
  gating: { personas: string[]; regions: string[] }
  feeds: unknown[]
}

export const revalidate = 0   // always fresh — the cache lives in the DB

export async function GET(req: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  // ── Ownership + provider fields ──────────────────────────────────────────────
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email, persona, region')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()

  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // ── Load config ──────────────────────────────────────────────────────────────
  const { data: cfgRow } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'livelaw_feed')
    .single()

  const cfg = (cfgRow?.value ?? null) as LiveLawConfig | null

  // If config missing or disabled, return empty (not an error — UI handles gracefully)
  if (!cfg?.enabled) return NextResponse.json({ items: [] })

  // ── Gating ───────────────────────────────────────────────────────────────────
  const allowedPersonas: string[] = cfg.gating?.personas ?? ['advocate']
  const allowedRegions:  string[] = cfg.gating?.regions  ?? ['india']

  const personaOk = allowedPersonas.includes(provider.persona ?? '')
  const regionOk  = allowedRegions.includes(provider.region  ?? '')

  if (!personaOk || !regionOk) return NextResponse.json({ items: [] })

  // ── Fetch latest cached items ─────────────────────────────────────────────────
  const maxItems = cfg.max_items ?? 30

  const { data: rows, error } = await supabaseAdmin
    .from('legal_news')
    .select('title, link, category, published_at')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(maxItems)

  if (error) {
    console.error('[legal-news] db error:', error.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ items: rows ?? [] })
}
