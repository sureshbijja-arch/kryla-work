/**
 * GET /api/mychat/court/tribunals
 *
 * Returns the India tribunal directory for an advocate/india member.
 * Clones the gating pattern from /api/mychat/court/config/route.ts.
 *
 * Query params:
 *   providerId (required)
 *   q          — full-text search on search_text (optional)
 *   category   — exact match on category column (optional)
 *
 * Response:
 *   { enabled: false }                  — gated or disabled
 *   { enabled: true, tribunals: [...] } — advocate/india member
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'
import type { CourtToolsConfig } from '@/lib/ecourts'

export const revalidate = 0

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
    .maybeSingle()

  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  if (provider.email === null) {
    await supabaseAdmin.from('providers').update({ email: user.email }).eq('id', provider.id)
  } else if (provider.email !== user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // ── Load config ──────────────────────────────────────────────────────────────
  const { data: cfgRow } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'court_tools')
    .single()

  const cfg = (cfgRow?.value ?? null) as CourtToolsConfig | null
  if (!cfg?.enabled) return NextResponse.json({ enabled: false })

  // ── Gating ───────────────────────────────────────────────────────────────────
  const allowedPersonas: string[] = cfg.gating?.personas ?? ['advocate']
  const allowedRegions:  string[] = cfg.gating?.regions  ?? ['india']

  if (
    !allowedPersonas.includes(provider.persona ?? '') ||
    !allowedRegions.includes(provider.region  ?? '')
  ) {
    return NextResponse.json({ enabled: false })
  }

  // ── Query tribunal_directory ─────────────────────────────────────────────────
  const q        = searchParams.get('q')?.trim()
  const category = searchParams.get('category')?.trim()

  let query = supabaseAdmin
    .from('tribunal_directory')
    .select('id, slug, short_name, full_name, category, portal_url, case_status_url, cause_list_url, orders_url, benches, notes')
    .eq('active', true)
    .order('sort_order')
    .order('short_name')

  if (q) {
    query = query.textSearch('search_text', q, { type: 'plain', config: 'simple' })
  }
  if (category) {
    query = query.eq('category', category)
  }

  const { data: tribunals, error } = await query.limit(50)

  if (error) {
    console.error('[court/tribunals] query error:', error.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ enabled: true, tribunals: tribunals ?? [] })
}
