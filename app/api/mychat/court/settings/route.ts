/**
 * GET  /api/mychat/court/settings  — get per-advocate court notification settings
 * PATCH /api/mychat/court/settings — toggle cause_list_alerts_enabled
 *
 * Response (GET):
 *   { enabled: false }                                   — gated
 *   { enabled: true, cause_list_alerts_enabled: bool }  — advocate/india member
 *
 * PATCH body: { providerId: string, cause_list_alerts_enabled: boolean }
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'
import type { CourtToolsConfig } from '@/lib/ecourts'

export const revalidate = 0

async function resolveProvider(email: string, providerId: string) {
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email, persona, region, whatsapp_number, cause_list_alerts_enabled')
    .eq('id', providerId)
    .maybeSingle()

  if (!provider) return null

  if (provider.email === null) {
    await supabaseAdmin.from('providers').update({ email }).eq('id', provider.id)
  } else if (provider.email !== email) {
    return null
  }

  const { data: cfgRow } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'court_tools')
    .single()

  const cfg = (cfgRow?.value ?? null) as CourtToolsConfig | null
  if (!cfg?.enabled) return null

  const allowedPersonas: string[] = cfg.gating?.personas ?? ['advocate']
  const allowedRegions:  string[] = cfg.gating?.regions  ?? ['india']

  if (
    !allowedPersonas.includes(provider.persona ?? '') ||
    !allowedRegions.includes(provider.region  ?? '')
  ) {
    return null
  }

  return provider
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await resolveProvider(user.email, providerId)
  if (!provider) return NextResponse.json({ enabled: false })

  return NextResponse.json({
    enabled:                     true,
    cause_list_alerts_enabled:   provider.cause_list_alerts_enabled ?? false,
    has_whatsapp:                !!provider.whatsapp_number,
  })
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, cause_list_alerts_enabled } = body
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await resolveProvider(user.email, providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  if (typeof cause_list_alerts_enabled !== 'boolean') {
    return NextResponse.json({ error: 'cause_list_alerts_enabled must be boolean' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('providers')
    .update({ cause_list_alerts_enabled, updated_at: new Date().toISOString() })
    .eq('id', provider.id)

  if (error) {
    console.error('[court/settings] PATCH error:', error.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, cause_list_alerts_enabled })
}
