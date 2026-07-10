/**
 * GET   /api/admin/verifications  — list pending advocate submissions
 * PATCH /api/admin/verifications  — verify or reject an advocate { providerId, status }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }    from '@/lib/supabase/server'
import { supabaseAdmin }   from '@/lib/supabase/admin'

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean)

async function assertAdmin(): Promise<{ email: string } | NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ADMIN_EMAILS.includes(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { email: user.email }
}

export async function GET() {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const { data, error } = await supabaseAdmin
    .from('providers')
    .select('id, first_name, last_name, email, verified, verification')
    .eq('persona', 'advocate')
    .not('verification', 'eq', '{}')
    .order('first_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ advocates: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { providerId, status } = body as { providerId: string; status: 'verified' | 'rejected' }

  if (!providerId || !['verified', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Load current verification object so we can patch only status fields
  const { data: existing } = await supabaseAdmin
    .from('providers')
    .select('verification')
    .eq('id', providerId)
    .single()

  const current = (existing?.verification ?? {}) as Record<string, unknown>
  const updated = {
    ...current,
    status,
    verified_at: new Date().toISOString(),
    verified_by: auth.email,
  }

  const { error } = await supabaseAdmin
    .from('providers')
    .update({
      verification: updated,
      verified:     status === 'verified',
    })
    .eq('id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, verification: updated })
}
