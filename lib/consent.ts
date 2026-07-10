import { supabaseAdmin } from '@/lib/supabase/admin'

interface ConsentEventOpts {
  providerId: string
  studentId:  string | null
  event:      'granted' | 'withdrawn' | 'updated' | 'erased'
  source:     'ai_intake' | 'manual' | 'client_withdrawal' | 'erasure'
  purpose?:   string
  actor?:     string
}

export async function logConsentEvent(
  admin: typeof supabaseAdmin,
  opts: ConsentEventOpts,
): Promise<void> {
  const { providerId, studentId, event, source, purpose, actor } = opts

  await admin.from('consent_events').insert({
    provider_id: providerId,
    student_id:  studentId ?? null,
    event,
    source,
    purpose:     purpose ?? null,
    actor:       actor   ?? null,
  })

  if (studentId) {
    await admin.from('students').update({
      consent_updated_at: new Date().toISOString(),
      ...(purpose ? { consent_purpose: purpose } : {}),
    }).eq('id', studentId)
  }
}
