import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // Verify authenticated session
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { providerId, sections } = body as { providerId: string; sections: unknown[] }

  if (!providerId || !Array.isArray(sections)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Confirm the authenticated user owns this provider record
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email')
    .eq('id', providerId)
    .single()

  if (!provider || provider.email !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('pages')
    .update({ sections })
    .eq('provider_id', providerId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
