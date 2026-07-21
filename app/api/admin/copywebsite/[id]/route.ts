import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function assertAdmin(): Promise<{ email: string } | NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { email: user.email }
}

// PATCH body: { status?: 'approved' | 'rejected' | 'done', output_type?: 'native' | 'clone', admin_note?: string }
// status is optional so a note can be saved on its own without forcing a
// status transition (previously admin_note was accepted here but had no UI
// input at all — an admin could see system-written notes but never add one).
// Approve/Reject stamp reviewed_at. Never triggers any build — admin builds the
// page by hand in MyKryla once approved; this route is bookkeeping only.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { status, output_type, admin_note } = body as {
    status?: 'approved' | 'rejected' | 'done'
    output_type?: 'native' | 'clone'
    admin_note?: string
  }

  if (status !== undefined && !['approved', 'rejected', 'done'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (status === 'approved' && !['native', 'clone'].includes(output_type ?? '')) {
    return NextResponse.json({ error: 'output_type required when approving' }, { status: 400 })
  }
  if (status === undefined && typeof admin_note !== 'string') {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (status) update.status = status
  if (status === 'approved') {
    update.output_type = output_type
    update.reviewed_at = new Date().toISOString()
  }
  if (status === 'rejected') {
    update.reviewed_at = new Date().toISOString()
  }
  if (typeof admin_note === 'string') {
    update.admin_note = admin_note.trim() || null
  }

  const { data: updated, error } = await supabaseAdmin
    .from('website_copy_requests')
    .update(update)
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ request: updated })
}
