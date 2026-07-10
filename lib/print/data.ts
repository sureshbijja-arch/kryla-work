/**
 * lib/print/data.ts — Per-kind data fetchers for the print facility.
 * Each helper verifies provider ownership before returning data.
 */

import { createClient }  from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Letterhead, ProviderMeta, DocumentData, CaseSheetData, ConsultationData, HearingsData } from './template'

// ── Auth helper ────────────────────────────────────────────────────────────────

export async function getAuthedProviderForPrint(providerId: string): Promise<{
  provider: ProviderMeta & { id: string; persona: string; letterhead: Letterhead | null }
} | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const { data } = await supabaseAdmin
    .from('providers')
    .select('id, first_name, last_name, persona, location, whatsapp_number, email, letterhead')
    .eq('id', providerId)
    .eq('email', user.email)
    .single()

  if (!data) return null

  return {
    provider: {
      id:             data.id,
      first_name:     data.first_name,
      last_name:      data.last_name,
      persona:        data.persona,
      location:       data.location,
      whatsapp_number: data.whatsapp_number,
      email:          data.email,
      letterhead:     (data.letterhead as Letterhead | null) ?? null,
    },
  }
}

// ── Document ───────────────────────────────────────────────────────────────────

export async function fetchDocumentData(
  providerId: string,
  draftId: string,
): Promise<DocumentData | null> {
  const { data } = await supabaseAdmin
    .from('drafts')
    .select('title, body, doc_type')
    .eq('id', draftId)
    .eq('provider_id', providerId)
    .single()

  if (!data) return null

  return {
    title:   data.title ?? 'Untitled',
    body:    (data.body as string) ?? '',
    docType: data.doc_type ?? '',
  }
}

// ── Case sheet ─────────────────────────────────────────────────────────────────

export async function fetchCaseSheetData(
  providerId: string,
  studentId: string,
): Promise<CaseSheetData | null> {
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('name, label_1, label_2, next_hearing_date, next_hearing_note, parent_name, parent_phone, parent_email, notes, sessions, created_at')
    .eq('id', studentId)
    .eq('provider_id', providerId)
    .single()

  if (!student) return null

  const { data: sessions } = await supabaseAdmin
    .from('student_sessions')
    .select('session_date, topic, homework, notes')
    .eq('student_id', studentId)
    .eq('provider_id', providerId)
    .order('session_date', { ascending: false })
    .limit(50)

  return {
    client: {
      name:              student.name,
      label_1:           student.label_1,
      label_2:           student.label_2,
      next_hearing_date: student.next_hearing_date,
      next_hearing_note: student.next_hearing_note,
      parent_name:       student.parent_name,
      parent_phone:      student.parent_phone,
      parent_email:      student.parent_email,
      notes:             student.notes,
      sessions:          student.sessions ?? 0,
      created_at:        student.created_at,
    },
    sessions: (sessions ?? []).map(s => ({
      session_date: s.session_date,
      topic:        s.topic,
      homework:     s.homework,
      notes:        s.notes,
    })),
  }
}

// ── Consultation ───────────────────────────────────────────────────────────────

export async function fetchConsultationData(
  providerId: string,
  sessionId: string,
): Promise<ConsultationData | null> {
  const { data: session } = await supabaseAdmin
    .from('student_sessions')
    .select('session_date, topic, homework, notes, student_id')
    .eq('id', sessionId)
    .eq('provider_id', providerId)
    .single()

  if (!session) return null

  const { data: student } = await supabaseAdmin
    .from('students')
    .select('name')
    .eq('id', session.student_id)
    .eq('provider_id', providerId)
    .single()

  return {
    clientName:  student?.name ?? 'Unknown client',
    sessionDate: session.session_date,
    topic:       session.topic,
    homework:    session.homework,
    notes:       session.notes,
  }
}

// ── Hearings ───────────────────────────────────────────────────────────────────

export async function fetchHearingsData(providerId: string): Promise<HearingsData> {
  const today = new Date().toISOString().slice(0, 10)

  const { data: students } = await supabaseAdmin
    .from('students')
    .select('name, label_1, next_hearing_date, next_hearing_note')
    .eq('provider_id', providerId)
    .gte('next_hearing_date', today)
    .order('next_hearing_date', { ascending: true })
    .limit(200)

  const todayMs = new Date(today).getTime()

  const hearings = (students ?? []).map(s => {
    const hearingMs = new Date(s.next_hearing_date).getTime()
    const days = Math.round((hearingMs - todayMs) / 86_400_000)
    return {
      name:              s.name,
      label_1:           s.label_1,
      next_hearing_date: s.next_hearing_date,
      next_hearing_note: s.next_hearing_note,
      days,
    }
  })

  const asOf = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  return { hearings, asOf }
}
