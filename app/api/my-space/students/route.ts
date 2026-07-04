import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('students')
    .select('id, name, label_1, label_2, sessions, next_session, notes, avatar_color, created_at, booking_id')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ students: data ?? [] })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { providerId, name, label1, label2, notes, nextSession, avatarColor } = body

  if (!providerId || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('students')
    .insert({
      provider_id:  providerId,
      name,
      label_1:      label1 ?? null,
      label_2:      label2 ?? null,
      notes:        notes ?? null,
      next_session: nextSession ?? null,
      avatar_color: avatarColor ?? '#6366F1',
      sessions:     0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ student: data })
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const { providerId, studentId, action, ...fields } = body

  if (!providerId || !studentId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (action === 'log_session') {
    // Increment session count
    const { data: current } = await supabaseAdmin
      .from('students')
      .select('sessions')
      .eq('id', studentId)
      .eq('provider_id', providerId)
      .single()

    const { error } = await supabaseAdmin
      .from('students')
      .update({ sessions: (current?.sessions ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', studentId)
      .eq('provider_id', providerId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // General update
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('name' in fields)        update.name         = fields.name
  if ('label1' in fields)      update.label_1      = fields.label1
  if ('label2' in fields)      update.label_2      = fields.label2
  if ('notes' in fields)       update.notes        = fields.notes
  if ('nextSession' in fields) update.next_session = fields.nextSession
  if ('avatarColor' in fields) update.avatar_color = fields.avatarColor

  const { error } = await supabaseAdmin
    .from('students')
    .update(update)
    .eq('id', studentId)
    .eq('provider_id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const body = await req.json()
  const { providerId, studentId } = body

  if (!providerId || !studentId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('students')
    .delete()
    .eq('id', studentId)
    .eq('provider_id', providerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
