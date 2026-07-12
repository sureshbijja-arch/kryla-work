/**
 * /api/mychat/treatment-plans
 *
 * CRUD for physiotherapy treatment / care plans.
 * Gated to the physio persona.
 *
 * GET    ?providerId=  → list all plans
 * GET    ?providerId=&studentId=  → list plans for a patient
 * POST   { providerId, studentId?, title, diagnosis, goals, modalities, frequency, duration_weeks, phases, body }  → create
 * PATCH  { providerId, id, ...fields }  → update
 * DELETE ?providerId=&id=  → delete
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

const COLS = 'id, provider_id, student_id, title, diagnosis, goals, modalities, frequency, duration_weeks, phases, body, status, created_at, updated_at'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  const studentId  = searchParams.get('studentId')

  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = await getPhysioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let query = supabaseAdmin
    .from('treatment_plans')
    .select(COLS)
    .eq('provider_id', providerId)
    .order('updated_at', { ascending: false })

  if (studentId) query = query.eq('student_id', studentId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plans: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, studentId, title, diagnosis, goals, modalities, frequency, duration_weeks, phases, docBody } = body

  if (!providerId || !title) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const provider = await getPhysioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('treatment_plans')
    .insert({
      provider_id:    providerId,
      student_id:     studentId ?? null,
      title,
      diagnosis:      diagnosis ?? '',
      goals:          goals ?? [],
      modalities:     modalities ?? [],
      frequency:      frequency ?? '',
      duration_weeks: duration_weeks ?? null,
      phases:         phases ?? [],
      body:           docBody ?? '',
      status:         'draft',
    })
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: data })
}

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, id, ...rest } = body

  if (!providerId || !id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const provider = await getPhysioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('treatment_plans')
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('provider_id', providerId)
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: data })
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
    .from('treatment_plans')
    .delete()
    .eq('id', id)
    .eq('provider_id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
