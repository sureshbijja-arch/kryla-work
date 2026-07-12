/**
 * /api/mychat/clinical-notes
 *
 * CRUD for clinical notes (eval, SOAP progress, discharge).
 * Gated to the physio persona.
 *
 * GET    ?providerId=  → list all notes for a provider (most recent first)
 * GET    ?providerId=&studentId=  → list notes for a specific patient
 * POST   { providerId, studentId?, note_type, visit_date, subjective, objective, assessment, plan, body, body_chart }  → create
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

const COLS = 'id, provider_id, student_id, note_type, visit_date, subjective, objective, assessment, plan, body, body_chart, status, share_token, created_at, updated_at'

// ── GET ───────────────────────────────────────────────────────────────────────
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
    .from('clinical_notes')
    .select(COLS)
    .eq('provider_id', providerId)
    .order('visit_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (studentId) query = query.eq('student_id', studentId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notes: data ?? [] })
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, studentId, note_type, visit_date, subjective, objective, assessment, plan, docBody, body_chart, title } = body

  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await getPhysioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('clinical_notes')
    .insert({
      provider_id: providerId,
      student_id:  studentId ?? null,
      note_type:   note_type ?? 'progress',
      visit_date:  visit_date ?? new Date().toISOString().split('T')[0],
      subjective:  subjective ?? '',
      objective:   objective ?? '',
      assessment:  assessment ?? '',
      plan:        plan ?? '',
      body:        docBody ?? '',
      body_chart:  body_chart ?? [],
      status:      'draft',
    })
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, id, share, ...rest } = body

  if (!providerId || !id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const provider = await getPhysioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Verify ownership of the note
  const { data: existing } = await supabaseAdmin
    .from('clinical_notes')
    .select('id, share_token')
    .eq('id', id)
    .eq('provider_id', providerId)
    .single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If share=true, generate a share token if not already set
  const shareToken = share === true && !existing.share_token
    ? (await supabaseAdmin.rpc('gen_random_uuid')).data
    : undefined

  const updateData: Record<string, unknown> = {
    ...rest,
    updated_at: new Date().toISOString(),
    ...(shareToken ? { share_token: shareToken } : {}),
    ...(share === false ? { share_token: null } : {}),
  }

  const { data, error } = await supabaseAdmin
    .from('clinical_notes')
    .update(updateData)
    .eq('id', id)
    .eq('provider_id', providerId)
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}

// ── DELETE ────────────────────────────────────────────────────────────────────
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
    .from('clinical_notes')
    .delete()
    .eq('id', id)
    .eq('provider_id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
