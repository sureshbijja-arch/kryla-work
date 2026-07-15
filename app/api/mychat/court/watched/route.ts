/**
 * GET  /api/mychat/court/watched  — list watched cases for the provider
 * POST /api/mychat/court/watched  — save a new watched case
 *
 * POST body:
 *   { cnr?, case_title?, case_type?, court_name?, party_name?,
 *     next_hearing_date?, next_hearing_note?, student_id?, source_url?, notes? }
 *
 * Reminder wiring: when next_hearing_date is set AND student_id is provided,
 * this route also writes next_hearing_date + next_hearing_note to the linked
 * students row so the existing hearing-reminders Inngest job fires the WhatsApp
 * reminder — no new reminder code needed.
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'
import { validateCnr, normalizeCnr } from '@/lib/ecourts'
import type { CourtToolsConfig } from '@/lib/ecourts'

export const revalidate = 0

// ── Shared auth + gating helper ────────────────────────────────────────────────

async function resolveProvider(userId: string, email: string, providerId: string) {
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

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await resolveProvider(user.id, user.email, providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data: cases, error } = await supabaseAdmin
    .from('watched_cases')
    .select('id, cnr, case_title, case_type, court_name, party_name, next_hearing_date, next_hearing_note, student_id, status, source_url, notes, created_at, updated_at')
    .eq('provider_id', providerId)
    .neq('status', 'archived')
    .order('next_hearing_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[court/watched] GET error:', error.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // Attach linked student name for display
  const studentIds = [...new Set((cases ?? []).map(c => c.student_id).filter(Boolean))]
  let studentNames: Record<string, string> = {}
  if (studentIds.length > 0) {
    const { data: students } = await supabaseAdmin
      .from('students')
      .select('id, name')
      .in('id', studentIds as string[])
    for (const s of students ?? []) {
      studentNames[s.id] = s.name
    }
  }

  return NextResponse.json({
    cases: (cases ?? []).map(c => ({
      ...c,
      student_name: c.student_id ? (studentNames[c.student_id] ?? null) : null,
    })),
  })
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId } = body
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await resolveProvider(user.id, user.email, providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const {
    cnr,
    case_title,
    case_type,
    court_name,
    party_name,
    next_hearing_date,
    next_hearing_note,
    student_id,
    source_url,
    notes,
  } = body as Record<string, string | undefined>

  // Validate CNR if provided
  let normalizedCnr: string | null = null
  if (cnr?.trim()) {
    normalizedCnr = normalizeCnr(cnr)
    const cnrErr = validateCnr(normalizedCnr)
    if (cnrErr) return NextResponse.json({ error: cnrErr }, { status: 400 })
  }

  // Must have at least some identifying info
  if (!normalizedCnr && !case_title?.trim() && !party_name?.trim()) {
    return NextResponse.json({ error: 'Provide a CNR, case title, or party name.' }, { status: 400 })
  }

  const { data: newCase, error } = await supabaseAdmin
    .from('watched_cases')
    .insert({
      provider_id:        providerId,
      cnr:                normalizedCnr,
      case_title:         case_title?.trim()    || null,
      case_type:          case_type?.trim()     || null,
      court_name:         court_name?.trim()    || null,
      party_name:         party_name?.trim()    || null,
      next_hearing_date:  next_hearing_date     || null,
      next_hearing_note:  next_hearing_note?.trim() || null,
      student_id:         student_id            || null,
      source_url:         source_url?.trim()    || null,
      notes:              notes?.trim()         || null,
      status:             'active',
    })
    .select('id, cnr, case_title, next_hearing_date, student_id')
    .single()

  if (error) {
    console.error('[court/watched] POST error:', error.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // ── Reminder wiring: write next_hearing_date to linked student ────────────
  if (newCase?.student_id && newCase?.next_hearing_date) {
    try {
      await supabaseAdmin
        .from('students')
        .update({
          next_session: newCase.next_hearing_date,
          ...(next_hearing_note ? { notes: `Next hearing: ${next_hearing_note}` } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', newCase.student_id)
        .eq('provider_id', providerId)
    } catch (err) {
      console.error('[court/watched] student reminder sync failed (non-fatal):', err)
    }
  }

  return NextResponse.json({ case: newCase }, { status: 201 })
}
