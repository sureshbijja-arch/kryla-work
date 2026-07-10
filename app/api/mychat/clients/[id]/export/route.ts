/**
 * GET /api/mychat/clients/[id]/export?providerId=
 * DPDP Act 2023: data portability — returns a JSON bundle of all data held for a client.
 */

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

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')
  if (!providerId) return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentId = params.id

  const [studentRes, sessionsRes, notificationsRes, consentEventsRes, draftsRes] = await Promise.all([
    supabaseAdmin.from('students').select('*').eq('id', studentId).eq('provider_id', providerId).single(),
    supabaseAdmin.from('student_sessions').select('*').eq('student_id', studentId).eq('provider_id', providerId).order('session_date', { ascending: false }),
    supabaseAdmin.from('notifications').select('*').eq('student_id', studentId).eq('provider_id', providerId).order('sent_at', { ascending: false }),
    supabaseAdmin.from('consent_events').select('*').eq('student_id', studentId).eq('provider_id', providerId).order('created_at', { ascending: false }),
    supabaseAdmin.from('drafts').select('id, title, doc_type, created_at, updated_at').eq('student_id', studentId).eq('provider_id', providerId),
  ])

  if (!studentRes.data) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const bundle = {
    exported_at:    new Date().toISOString(),
    client:         studentRes.data,
    sessions:       sessionsRes.data       ?? [],
    notifications:  notificationsRes.data  ?? [],
    consent_events: consentEventsRes.data  ?? [],
    drafts:         draftsRes.data         ?? [],
  }

  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      'Content-Type':        'application/json',
      'Content-Disposition': `attachment; filename="client-${studentId}-export.json"`,
    },
  })
}
