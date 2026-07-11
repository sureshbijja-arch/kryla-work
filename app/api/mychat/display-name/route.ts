import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function assertOwner(providerId: string, userEmail: string) {
  const { data } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('email', userEmail)
    .maybeSingle()
  return !!data
}

// POST — update the display name shown in the hero (writes first_name / last_name)
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { providerId, displayName } = body

  if (!providerId || !displayName?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const ok = await assertOwner(providerId, user.email)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const trimmed = displayName.trim()
  if (trimmed.length < 1 || trimmed.length > 80) {
    return NextResponse.json({ error: 'Name must be 1–80 characters' }, { status: 400 })
  }

  // Split on first space: "Priya Sharma" → first_name="Priya", last_name="Sharma"
  const spaceIdx = trimmed.indexOf(' ')
  const firstName = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)
  const lastName  = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim()

  const { error } = await supabaseAdmin
    .from('providers')
    .update({ first_name: firstName, last_name: lastName })
    .eq('id', providerId)

  if (error) {
    console.error('[display-name] update error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, firstName, lastName })
}
