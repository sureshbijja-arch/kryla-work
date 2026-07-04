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

  const [bookingsRes, studentsRes, eventsRes, reactionsRes] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .select('status, service, preferred_date')
      .eq('provider_id', providerId),
    supabaseAdmin
      .from('students')
      .select('sessions, label_2')
      .eq('provider_id', providerId),
    supabaseAdmin
      .from('page_events')
      .select('event_type')
      .eq('provider_id', providerId),
    supabaseAdmin
      .from('page_reactions')
      .select('likes')
      .eq('provider_id', providerId)
      .single(),
  ])

  const bookings  = bookingsRes.data  ?? []
  const students  = studentsRes.data  ?? []
  const events    = eventsRes.data    ?? []

  // Booking counts
  const totalBookings   = bookings.length
  const accepted        = bookings.filter(b => b.status === 'accepted').length
  const rejected        = bookings.filter(b => b.status === 'rejected').length
  const pending         = bookings.filter(b => b.status === 'pending').length

  // Student counts
  const totalStudents   = students.length
  const totalSessions   = students.reduce((sum, s) => sum + (s.sessions ?? 0), 0)

  // Visitor / engagement counts
  const uniqueViews     = events.filter(e => e.event_type === 'page_view').length
  const likes           = reactionsRes.data?.likes ?? 0

  // Service/subject split for top 6
  const subjectMap: Record<string, number> = {}
  for (const b of bookings) {
    const key = b.service ?? 'Other'
    subjectMap[key] = (subjectMap[key] ?? 0) + 1
  }
  const topSubjects = Object.entries(subjectMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }))

  return NextResponse.json({
    totalBookings,
    accepted,
    rejected,
    pending,
    totalStudents,
    totalSessions,
    uniqueViews,
    likes,
    topSubjects,
  })
}
