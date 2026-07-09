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

  const [configRes, notificationsRes] = await Promise.all([
    supabaseAdmin
      .from('system_config')
      .select('value')
      .eq('key', 'notification_types_enabled')
      .single(),
    supabaseAdmin
      .from('notifications')
      .select(`
        id, type, channel, recipient, status, sent_at,
        provider:providers!provider_id(first_name, last_name),
        student:students!student_id(name)
      `)
      .order('sent_at', { ascending: false })
      .limit(200),
  ])

  const config = (configRes.data?.value ?? {
    hearing_reminder_7d:  true,
    hearing_reminder_1d:  true,
    consultation_followup: true,
  }) as Record<string, boolean>

  return NextResponse.json({
    config,
    notifications: notificationsRes.data ?? [],
  })
}

// PATCH { key: string, enabled: boolean }
export async function PATCH(req: NextRequest) {
  const auth = await assertAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { key, enabled } = body as { key: string; enabled: boolean }
  if (typeof key !== 'string' || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Load current config
  const { data: existing } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'notification_types_enabled')
    .single()

  const current = (existing?.value ?? {}) as Record<string, boolean>
  const updated = { ...current, [key]: enabled }

  const { error } = await supabaseAdmin
    .from('system_config')
    .upsert({
      key:        'notification_types_enabled',
      value:      updated,
      updated_at: new Date().toISOString(),
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: updated })
}
