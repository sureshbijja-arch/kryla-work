/**
 * GET /api/mychat/court/locator
 *
 * Searches court_directory for India court complexes.
 * Fully in-app — no external fetch (seeded data).
 *
 * Query params:
 *   providerId  (required)
 *   q           full-text search term (optional)
 *   state       filter by state (optional, case-insensitive)
 *   type        filter by court_type: supreme|high|district|tribunal (optional)
 *
 * Auth + gating mirrors /api/mychat/legal-news/route.ts.
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

  // ── Gating ───────────────────────────────────────────────────────────────────
  const { data: cfgRow } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'court_tools')
    .single()

  const cfg = (cfgRow?.value ?? null) as CourtToolsConfig | null
  if (!cfg?.enabled) return NextResponse.json({ courts: [] })

  const allowedPersonas: string[] = cfg.gating?.personas ?? ['advocate']
  const allowedRegions:  string[] = cfg.gating?.regions  ?? ['india']

  if (
    !allowedPersonas.includes(provider.persona ?? '') ||
    !allowedRegions.includes(provider.region  ?? '')
  ) {
    return NextResponse.json({ courts: [] })
  }

  // ── Query ────────────────────────────────────────────────────────────────────
  const q     = searchParams.get('q')?.trim().toLowerCase() ?? ''
  const state = searchParams.get('state')?.trim() ?? ''
  const type  = searchParams.get('type')?.trim() ?? ''

  let query = supabaseAdmin
    .from('court_directory')
    .select('id, court_type, state, district, complex_name, address, city, pincode, latitude, longitude, map_url')
    .eq('active', true)
    .order('court_type')  // supreme → high → district → tribunal
    .order('state')
    .order('complex_name')
    .limit(50)

  if (type) {
    query = query.eq('court_type', type)
  }
  if (state) {
    query = query.ilike('state', `%${state}%`)
  }
  if (q) {
    // Full-text search via search_text column (GIN index)
    query = query.textSearch('search_text', q, { type: 'plain', config: 'simple' })
  }

  const { data: courts, error } = await query

  if (error) {
    console.error('[court/locator] db error:', error.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ courts: courts ?? [] })
}
