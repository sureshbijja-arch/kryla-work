/**
 * /api/mychat/drafts — saved draft CRUD.
 *
 * GET  ?providerId=&studentId=   → list drafts (all or by matter)
 * POST  { providerId, studentId?, docType, title, body, status }  → create
 * PATCH { providerId, draftId, title?, body?, status?, studentId?, shareToken? } → update
 * DELETE { providerId, draftId }  → delete
 */

import { randomUUID }    from 'node:crypto'
import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse }  from 'next/server'

async function getAuthedProvider(providerId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()
  return provider
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  const studentId  = searchParams.get('studentId')   // optional — filter by matter

  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let query = supabaseAdmin
    .from('drafts')
    .select('id, student_id, doc_type, title, body, status, share_token, created_at, updated_at')
    .eq('provider_id', providerId)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (studentId) {
    query = query.eq('student_id', studentId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ drafts: data ?? [] })
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const body = await req.json()
  const { providerId, studentId, docType, title, draftBody, status } = body

  if (!providerId || !docType || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // If studentId given, verify it belongs to this provider
  if (studentId) {
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('provider_id', providerId)
      .single()
    if (!student) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('drafts')
    .insert({
      provider_id: providerId,
      student_id:  studentId ?? null,
      doc_type:    docType,
      title,
      body:        draftBody ?? '',
      status:      status ?? 'draft',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ draft: data })
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const body = await req.json()
  const { providerId, draftId, title, draftBody, status, studentId, enableShare } = body

  if (!providerId || !draftId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // IDOR guard: when re-attaching to a matter, verify the student belongs to this provider
  if (studentId !== undefined && studentId !== null) {
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('provider_id', providerId)
      .single()
    if (!student) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Build update payload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (title      !== undefined) updates.title      = title
  if (draftBody  !== undefined) updates.body       = draftBody
  if (status     !== undefined) updates.status     = status
  if (studentId  !== undefined) updates.student_id = studentId ?? null

  // Use node:crypto — no insecure Math.random() fallback for security tokens
  if (enableShare === true)  updates.share_token = randomUUID()
  if (enableShare === false) updates.share_token = null

  const { data, error } = await supabaseAdmin
    .from('drafts')
    .update(updates)
    .eq('id', draftId)
    .eq('provider_id', providerId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ draft: data })
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const body = await req.json()
  const { providerId, draftId } = body

  if (!providerId || !draftId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('drafts')
    .delete()
    .eq('id', draftId)
    .eq('provider_id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
