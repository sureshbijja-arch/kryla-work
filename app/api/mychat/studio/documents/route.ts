/**
 * /api/mychat/studio/documents
 *
 * CRUD for studio_documents.
 * Replaces /api/mychat/clinical-notes, /api/mychat/treatment-plans, /api/mychat/hep.
 *
 * GET    ?providerId=&[studentId=]&[doc_type=]  → list documents
 * POST   { providerId, studentId?, persona, doc_type, title, body, structured, visit_date } → create
 * PATCH  { providerId, id, ...fields }  → update (body, title, status, share)
 * DELETE ?providerId=&id=  → delete
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'

async function getStudioProvider(providerId: string, email: string) {
  const { data } = await supabaseAdmin
    .from('providers')
    .select('id, email, persona')
    .eq('id', providerId)
    .eq('email', email)
    .single()
  return data ?? null
}

const COLS = 'id, provider_id, student_id, persona, doc_type, title, body, structured, status, visit_date, share_token, created_at, updated_at'

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  const id         = searchParams.get('id')
  const studentId  = searchParams.get('studentId')
  const docType    = searchParams.get('doc_type')

  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = await getStudioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Single document fetch by id
  if (id) {
    const { data, error } = await supabaseAdmin
      .from('studio_documents')
      .select(COLS)
      .eq('id', id)
      .eq('provider_id', providerId)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ document: data })
  }

  let query = supabaseAdmin
    .from('studio_documents')
    .select(COLS)
    .eq('provider_id', providerId)
    .order('visit_date',  { ascending: false })
    .order('created_at', { ascending: false })

  if (studentId) query = query.eq('student_id', studentId)
  if (docType)   query = query.eq('doc_type',   docType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documents: data ?? [] })
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, studentId, persona, doc_type, title, body: docBody, structured, visit_date } = body

  if (!providerId || !doc_type) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const provider = await getStudioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('studio_documents')
    .insert({
      provider_id: providerId,
      student_id:  studentId ?? null,
      persona:     persona ?? provider.persona,
      doc_type:    doc_type,
      title:       title ?? '',
      body:        docBody ?? '',
      structured:  structured ?? {},
      status:      'draft',
      visit_date:  visit_date ?? new Date().toISOString().split('T')[0],
    })
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ document: data })
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, id, share, ...rest } = body

  if (!providerId || !id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const provider = await getStudioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from('studio_documents')
    .select('id, share_token')
    .eq('id', id)
    .eq('provider_id', providerId)
    .single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Generate share token on demand
  const shareToken = share === true && !existing.share_token
    ? (await supabaseAdmin.rpc('gen_random_uuid')).data
    : undefined

  const updateData: Record<string, unknown> = {
    ...rest,
    updated_at: new Date().toISOString(),
    ...(shareToken          ? { share_token: shareToken } : {}),
    ...(share === false     ? { share_token: null }       : {}),
  }

  const { data, error } = await supabaseAdmin
    .from('studio_documents')
    .update(updateData)
    .eq('id', id)
    .eq('provider_id', providerId)
    .select(COLS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ document: data })
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

  const provider = await getStudioProvider(providerId, user.email)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { error } = await supabaseAdmin
    .from('studio_documents')
    .delete()
    .eq('id', id)
    .eq('provider_id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
