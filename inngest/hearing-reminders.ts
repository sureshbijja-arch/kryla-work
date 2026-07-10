/**
 * inngest/hearing-reminders.ts — Daily cron: WhatsApp hearing-date reminders.
 *
 * Cron: 02:30 UTC (~08:00 IST) every day.
 *
 * Two reminder windows per run:
 *   7-day: next_hearing_date = today+7  AND  reminder_7d_sent_for ≠ that date
 *   1-day: next_hearing_date = today+1  AND  reminder_1d_sent_for ≠ that date
 *
 * Recipients:
 *   Advocate: always (uses providers.whatsapp_number)
 *   Client:   only if whatsapp_consent = true  AND  remind_client = true  AND  parent_phone set
 *             (parent_phone is re-labelled "Contact phone" for the advocate persona)
 *
 * Dedupe: dedupe column is set to the hearing date after send, so re-runs are safe.
 * All sends are written to the notifications table regardless of success/failure.
 *
 * Registered in app/api/inngest/route.ts
 */

import { inngest }           from '@/lib/inngest'
import { supabaseAdmin }     from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

/** Returns a YYYY-MM-DD date string for today + offsetDays (UTC). */
function isoDate(offsetDays: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

async function sendRemindersForWindow(
  offsetDays: number,
  dedupeCol: 'reminder_7d_sent_for' | 'reminder_1d_sent_for',
): Promise<number> {
  const hearingDate = isoDate(offsetDays)
  const windowLabel = offsetDays === 7 ? '7 days' : 'tomorrow'
  const notifType   = offsetDays === 7 ? 'hearing_reminder_7d' : 'hearing_reminder_1d'

  // Find all clients with this hearing date whose reminder hasn't been sent yet
  const { data: clients, error } = await supabaseAdmin
    .from('students')
    .select(`
      id, name, next_hearing_date, next_hearing_note, whatsapp_consent, remind_client, parent_phone, consent_token,
      provider:providers!provider_id ( id, first_name, whatsapp_number )
    `)
    .eq('next_hearing_date', hearingDate)
    .or(`${dedupeCol}.is.null,${dedupeCol}.neq.${hearingDate}`)

  if (error) {
    console.error(`[hearing-reminders] query failed (${offsetDays}d):`, error.message)
    return 0
  }
  if (!clients?.length) {
    console.log(`[hearing-reminders] no clients with hearing in ${offsetDays}d`)
    return 0
  }

  let sent = 0

  for (const client of clients) {
    const provider = client.provider as unknown as { id: string; first_name: string; whatsapp_number: string | null } | null
    if (!provider) continue

    const noteStr        = client.next_hearing_note ? ` (${client.next_hearing_note})` : ''
    const withdrawalLine = (client as Record<string, unknown>).consent_token
      ? `\n\nTo stop these messages: https://kryla.work/consent/${(client as Record<string, unknown>).consent_token}`
      : ''
    const advocateBody = (
      `📅 Hearing reminder: *${client.name}* has a hearing in *${windowLabel}* on ${hearingDate}${noteStr}.\n\n` +
      `Manage in My Chat: https://kryla.work/mychat`
    )
    const clientBody   = (
      `📅 Reminder from your advocate: Your hearing is *${windowLabel}* on ${hearingDate}${noteStr}.\n\n` +
      `Please confirm with your advocate if you have questions.${withdrawalLine}`
    )

    // ── Send to advocate ────────────────────────────────────────────────────
    if (provider.whatsapp_number) {
      const res = await sendWhatsAppMessage({ to: provider.whatsapp_number, text: advocateBody })
      await supabaseAdmin.from('notifications').insert({
        provider_id: provider.id,
        student_id:  client.id,
        type:        notifType,
        channel:     'whatsapp',
        recipient:   provider.whatsapp_number,
        body:        advocateBody,
        status:      res.success ? 'sent' : 'failed',
      })
      if (res.success) sent++
    }

    // ── Send to client (DPDP consent required) ──────────────────────────────
    if (client.whatsapp_consent && client.remind_client && client.parent_phone) {
      const clientRes = await sendWhatsAppMessage({ to: client.parent_phone, text: clientBody })
      await supabaseAdmin.from('notifications').insert({
        provider_id: provider.id,
        student_id:  client.id,
        type:        `${notifType}_client`,
        channel:     'whatsapp',
        recipient:   client.parent_phone,
        body:        clientBody,
        status:      clientRes.success ? 'sent' : 'failed',
      })
      if (clientRes.success) sent++
    }

    // ── Mark deduped ────────────────────────────────────────────────────────
    await supabaseAdmin
      .from('students')
      .update({ [dedupeCol]: hearingDate })
      .eq('id', client.id)
  }

  console.log(`[hearing-reminders] ${offsetDays}d window: sent ${sent} message(s) for ${clients.length} client(s)`)
  return sent
}

export const hearingRemindersFunction = inngest.createFunction(
  { id: 'hearing-reminders', name: 'Hearing date reminders' },
  { cron: '30 2 * * *' },   // 02:30 UTC = ~08:00 IST
  async ({ step }) => {
    const cfg = await step.run('load-notification-config', async () => {
      const { data } = await supabaseAdmin
        .from('system_config')
        .select('value')
        .eq('key', 'notification_types_enabled')
        .single()
      return (data?.value ?? {}) as Record<string, boolean>
    })

    // Single "hearing_reminders" toggle controls both windows
    const remindersEnabled = cfg['hearing_reminders'] !== false

    const sent7d = remindersEnabled
      ? await step.run('send-7-day-reminders', () => sendRemindersForWindow(7, 'reminder_7d_sent_for'))
      : (console.log('[hearing-reminders] hearing reminders disabled via admin config'), 0)

    const sent1d = remindersEnabled
      ? await step.run('send-1-day-reminders', () => sendRemindersForWindow(1, 'reminder_1d_sent_for'))
      : 0

    return { sent7d, sent1d }
  },
)
