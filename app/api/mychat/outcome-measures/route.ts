/**
 * /api/mychat/outcome-measures
 *
 * CRUD for outcome measure recordings.
 * Gated to the physio persona.
 *
 * GET    ?providerId=&studentId=  → list all outcome measurements for a patient (sorted by date)
 * GET    ?providerId=&studentId=&measure_type=  → filtered by measure type (for trend chart)
 * POST   { providerId, studentId, measure_type, value, score, unit, notes, recorded_date }  → record
 * DELETE ?providerId=&id=  → delete a single reading
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'

async function getPhysioProvider(providerId: string, email: string) {
  const { data } = await supabaseAdmin
    .from('providers')
    .select('id, email, persona')
    .eq('id', providerId)
    .eq('email', email)
    .single()
  if (!data || data.persona !== 'physio') return null
  return data
}

const COLS = 'id, provider_id, student_id, measure_type, value, score, unit, notes, recorded_date, created_at'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId   = searchParams.get('providerId')
  const studentId    = searchParams.get('studentId')
  const measureType  = searchParams.get('measure_type')

  if (!providerId || !studentId) return NextResponse.json({ error: 'Missing providerId or studentId' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = await getPhysioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let query = supabaseAdmin
    .from('outcome_measures')
    .select(COLS)
    .eq('provider_id', providerId)
    .eq('student_id', studentId)
    .order('recorded_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (measureType) query = query.eq('measure_type', measureType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ measures: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, studentId, measure_type, value, score, unit, notes, recorded_date } = body

  if (!providerId || !studentId || !measure_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await getPhysioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('outcome_measures')
    .insert({
      provider_id:   providerId,
      student_id:    studentId,
      measure_type,
      value:         value ?? {},
      score:         score ?? null,
      unit:          unit ?? null,
      notes:         notes ?? null,
      recorded_date: recorded_date ?? new Date().toISOString().split('T')[0],
    })
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ measure: data })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  const id         = searchParams.get('id')

  if (!providerId || !id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = await getPhysioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('outcome_measures')
    .delete()
    .eq('id', id)
    .eq('provider_id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
