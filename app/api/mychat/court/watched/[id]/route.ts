/**
 * PATCH  /api/mychat/court/watched/[id]  — update a watched case
 * DELETE /api/mychat/court/watched/[id]  — archive (soft-delete) a watched case
 *
 * PATCH body: any subset of:
 *   { case_title, case_type, court_name, party_name, next_hearing_date,
 *     next_hearing_note, student_id, status, notes }
 *
 * Reminder wiring: PATCH with next_hearing_date + a linked student_id also
 * updates students.next_session so the existing hearing-reminders job fires.
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'
import type { CourtToolsConfig } from '@/lib/ecourts'

export const revalidate = 0

async function resolveProvider(email: string, providerId: string) {
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email, persona, region')
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

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId } = body
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await resolveProvider(user.email, providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const allowed = [
    'case_title', 'case_type', 'court_name', 'party_name',
    'next_hearing_date', 'next_hearing_note', 'student_id',
    'status', 'notes', 'source_url', 'last_checked_at',
  ] as const

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) {
      update[key] = body[key] ?? null
    }
  }

  const { data: updated, error } = await supabaseAdmin
    .from('watched_cases')
    .update(update)
    .eq('id', params.id)
    .eq('provider_id', providerId)
    .select('id, cnr, case_title, next_hearing_date, next_hearing_note, student_id')
    .single()

  if (error) {
    console.error('[court/watched/[id]] PATCH error:', error.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // ── Reminder wiring ───────────────────────────────────────────────────────
  const effectiveStudentId = body.student_id ?? updated.student_id
  const effectiveHearingDate = body.next_hearing_date ?? updated.next_hearing_date
  if (effectiveStudentId && effectiveHearingDate) {
    try {
      const noteUpdate = body.next_hearing_note ?? updated.next_hearing_note
      await supabaseAdmin
        .from('students')
        .update({
          next_session: effectiveHearingDate,
          ...(noteUpdate ? { notes: `Next hearing: ${noteUpdate}` } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', effectiveStudentId)
        .eq('provider_id', providerId)
    } catch (err) {
      console.error('[court/watched/[id]] student reminder sync failed (non-fatal):', err)
    }
  }

  return NextResponse.json({ case: updated })
}

// ── DELETE (soft — sets status to archived) ────────────────────────────────────

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await resolveProvider(user.email, providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('watched_cases')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('provider_id', providerId)

  if (error) {
    console.error('[court/watched/[id]] DELETE error:', error.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
