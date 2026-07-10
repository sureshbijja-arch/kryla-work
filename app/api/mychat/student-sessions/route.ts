import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { inngest, CONSULTATION_LOGGED_EVENT } from '@/lib/inngest'
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
  const studentId  = searchParams.get('studentId')

  if (!providerId || !studentId) {
    return NextResponse.json({ error: 'Missing providerId or studentId' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('student_sessions')
    .select('id, session_date, topic, homework, notes, attended, created_at')
    .eq('provider_id', providerId)
    .eq('student_id', studentId)
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data ?? [] })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { providerId, studentId, sessionDate, topic, homework, notes, attended, sendFollowup } = body

  if (!providerId || !studentId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the student belongs to this provider
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, sessions')
    .eq('id', studentId)
    .eq('provider_id', providerId)
    .single()

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // Insert session record + increment counter in parallel
  const [sessionResult] = await Promise.all([
    supabaseAdmin.from('student_sessions').insert({
      provider_id:  providerId,
      student_id:   studentId,
      session_date: sessionDate ?? new Date().toISOString().slice(0, 10),
      topic:        topic    ?? null,
      homework:     homework ?? null,
      notes:        notes    ?? null,
      attended:     attended ?? true,
    }).select().single(),

    supabaseAdmin.from('students')
      .update({ sessions: (student.sessions ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', studentId)
      .eq('provider_id', providerId),
  ])

  if (sessionResult.error) {
    return NextResponse.json({ error: sessionResult.error.message }, { status: 500 })
  }

  // Fire follow-up event if advocate opted in — awaited so Vercel doesn't freeze before the send
  // (DPDP consent + config kill-switch are checked inside the Inngest function)
  if (sendFollowup && sessionResult.data?.id) {
    try {
      await inngest.send({
        name: CONSULTATION_LOGGED_EVENT,
        data: { providerId, studentId, sessionId: sessionResult.data.id },
      })
    } catch (err) {
      console.error('[student-sessions] Failed to send consultation.logged event:', err)
      // Non-fatal — session was saved successfully; event failure just means no WhatsApp follow-up
    }
  }

  return NextResponse.json({ session: sessionResult.data })
}

export async function DELETE(req: Request) {
  const body = await req.json()
  const { providerId, sessionId, studentId } = body

  if (!providerId || !sessionId || !studentId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await getAuthedProvider(providerId)
  if (!provider) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Decrement session counter before deleting
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('sessions')
    .eq('id', studentId)
    .eq('provider_id', providerId)
    .single()

  await supabaseAdmin.from('student_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('provider_id', providerId)

  if (student && student.sessions > 0) {
    await supabaseAdmin.from('students')
      .update({ sessions: student.sessions - 1, updated_at: new Date().toISOString() })
      .eq('id', studentId)
      .eq('provider_id', providerId)
  }

  return NextResponse.json({ success: true })
}
