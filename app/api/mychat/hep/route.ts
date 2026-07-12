/**
 * /api/mychat/hep
 *
 * CRUD for Home Exercise Programs (HEP).
 * Gated to the physio persona.
 *
 * GET    ?providerId=  → list all HEPs
 * GET    ?providerId=&studentId=  → list HEPs for a patient
 * POST   { providerId, studentId?, title, exercises, instructions, body }  → create
 * PATCH  { providerId, id, ...fields, share? }  → update / generate share token
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

const COLS = 'id, provider_id, student_id, title, exercises, instructions, body, status, share_token, created_at, updated_at'

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
    .from('hep_programs')
    .select(COLS)
    .eq('provider_id', providerId)
    .order('updated_at', { ascending: false })

  if (studentId) query = query.eq('student_id', studentId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ heps: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, studentId, title, exercises, instructions, docBody } = body

  if (!providerId || !title) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const provider = await getPhysioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('hep_programs')
    .insert({
      provider_id:  providerId,
      student_id:   studentId ?? null,
      title,
      exercises:    exercises ?? [],
      instructions: instructions ?? '',
      body:         docBody ?? '',
      status:       'draft',
    })
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ hep: data })
}

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, id, share, ...rest } = body

  if (!providerId || !id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const provider = await getPhysioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Check ownership + existing share token
  const { data: existing } = await supabaseAdmin
    .from('hep_programs')
    .select('id, share_token')
    .eq('id', id)
    .eq('provider_id', providerId)
    .single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Generate a share token if requested and none exists
  let shareToken: string | undefined
  if (share === true && !existing.share_token) {
    const { data: uuid } = await supabaseAdmin.rpc('gen_random_uuid')
    shareToken = uuid as string
  }

  const updateData: Record<string, unknown> = {
    ...rest,
    updated_at: new Date().toISOString(),
    ...(shareToken ? { share_token: shareToken } : {}),
    ...(share === false ? { share_token: null } : {}),
  }

  const { data, error } = await supabaseAdmin
    .from('hep_programs')
    .update(updateData)
    .eq('id', id)
    .eq('provider_id', providerId)
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ hep: data })
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
    .from('hep_programs')
    .delete()
    .eq('id', id)
    .eq('provider_id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
