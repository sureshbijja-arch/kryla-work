/**
 * inngest/consultation-followup.ts — Event-driven post-consultation WhatsApp follow-up.
 *
 * Triggered by: kryla/consultation.logged
 * Emitted by:   POST /api/mychat/student-sessions  when the advocate checks "Send follow-up"
 *
 * Sends a WhatsApp message to the client containing:
 *   - Acknowledgement of the consultation
 *   - Matter discussed (topic)
 *   - Action items (homework field)
 *
 * Guards:
 *   - client.whatsapp_consent must be true (DPDP Act 2023)
 *   - client.parent_phone must be set
 *
 * Registered in app/api/inngest/route.ts
 */

import {
  inngest,
  CONSULTATION_LOGGED_EVENT,
  type ConsultationLoggedPayload,
} from '@/lib/inngest'
import { supabaseAdmin }       from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export const consultationFollowupFunction = inngest.createFunction(
  { id: 'consultation-followup', name: 'Post-consultation follow-up' },
  { event: CONSULTATION_LOGGED_EVENT },
  async ({ event, step }) => {
    const { providerId, studentId, sessionId } = event.data as ConsultationLoggedPayload

    await step.run('send-client-followup', async () => {
      // Load session + client in parallel
      const [sessionRes, clientRes] = await Promise.all([
        supabaseAdmin
          .from('student_sessions')
          .select('topic, homework, session_date, notes')
          .eq('id', sessionId)
          .single(),
        supabaseAdmin
          .from('students')
          .select('name, parent_phone, whatsapp_consent')
          .eq('id', studentId)
          .eq('provider_id', providerId)
          .single(),
      ])

      const session = sessionRes.data
      const client  = clientRes.data

      if (!session || !client) {
        console.warn('[consultation-followup] session or client not found', { sessionId, studentId })
        return
      }

      if (!client.whatsapp_consent) {
        console.log('[consultation-followup] client has not given WhatsApp consent — skipping', { studentId })
        return
      }

      if (!client.parent_phone) {
        console.log('[consultation-followup] no phone number for client — skipping', { studentId })
        return
      }

      // Build message
      const parts: string[] = [`Hi *${client.name}*, thank you for your consultation.`]
      if (session.topic)    parts.push(`\n*Matter discussed:* ${session.topic}`)
      if (session.homework) parts.push(`\n*Next steps / action items:*\n${session.homework}`)
      parts.push('\n\nPlease reach out if you have any questions.')

      const body   = parts.join('')
      const result = await sendWhatsAppMessage({ to: client.parent_phone, text: body })

      await supabaseAdmin.from('notifications').insert({
        provider_id: providerId,
        student_id:  studentId,
        type:        'consultation_followup',
        channel:     'whatsapp',
        recipient:   client.parent_phone,
        body,
        status:      result.success ? 'sent' : 'failed',
      })

      console.log(`[consultation-followup] follow-up ${result.success ? 'sent' : 'failed'} → session ${sessionId}`)
    })
  },
)
