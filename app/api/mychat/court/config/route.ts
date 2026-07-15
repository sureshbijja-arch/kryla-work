/**
 * GET /api/mychat/court/config
 *
 * Returns the court_tools config for an india-region advocate member.
 * Clones the gating pattern from /api/mychat/legal-news/route.ts.
 *
 * Response:
 *   { enabled: false }           — gated out or disabled
 *   { enabled: true, portals }   — portals record for the client to build deep-links
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

  const personaOk = allowedPersonas.includes(provider.persona ?? '')
  const regionOk  = allowedRegions.includes(provider.region  ?? '')

  if (!personaOk || !regionOk) return NextResponse.json({ enabled: false })

  return NextResponse.json({ enabled: true, portals: cfg.portals })
}
