// inngest/booking-reminders.ts — Daily cron: WhatsApp reminders for accepted bookings.
//
// Cron: hourly (bookings have specific times, unlike hearing dates which are whole days —
// an hourly check keeps the 24h/2h windows accurate without a wide miss window).
//
// Two reminder windows per run, checked against each accepted booking's start_at:
//   24h: start_at is 23.5-24.5h from now AND reminder_24h_sent_at is null
//   2h:  start_at is 1.5-2.5h from now  AND reminder_2h_sent_at is null
//
// Dedupe: the corresponding *_sent_at column is set after a successful send, so
// re-runs within the same window don't double-send.
// All sends are written to the notifications table regardless of success/failure.
//
// Registered in app/api/inngest/route.ts

import { inngest }       from '@/lib/inngest'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendWhatsAppMessage, buildBookingReminderMessage } from '@/lib/whatsapp'

async function sendRemindersForWindow(
  hoursOut: number,
  dedupeCol: 'reminder_24h_sent_at' | 'reminder_2h_sent_at',
  windowLabel: '24 hours' | '2 hours',
): Promise<number> {
  const now = new Date()
  const windowStart = new Date(now.getTime() + (hoursOut - 0.5) * 3600_000)
  const windowEnd   = new Date(now.getTime() + (hoursOut + 0.5) * 3600_000)

  const { data: bookings, error } = await supabaseAdmin
    .from('bookings')
    .select('id, customer_name, customer_phone, service, start_at, provider_id, providers!provider_id(first_name)')
    .eq('status', 'accepted')
    .is(dedupeCol, null)
    .gte('start_at', windowStart.toISOString())
    .lte('start_at', windowEnd.toISOString())

  if (error) {
    console.error(`[booking-reminders] query failed (${hoursOut}h):`, error.message)
    return 0
  }
  if (!bookings?.length) return 0

  let sent = 0
  for (const b of bookings) {
    const provider = b.providers as unknown as { first_name: string } | null
    const msg = buildBookingReminderMessage({
      customerName: b.customer_name,
      memberName:   provider?.first_name ?? 'your provider',
      service:      b.service,
      startAt:      b.start_at as string,
      windowLabel,
    })
    const res = await sendWhatsAppMessage({ to: b.customer_phone, text: msg })
    await supabaseAdmin.from('notifications').insert({
      provider_id: b.provider_id,
      booking_id:  b.id,
      type:        `booking_reminder_${hoursOut}h`,
      channel:     'whatsapp',
      recipient:   b.customer_phone,
      body:        msg,
      status:      res.success ? 'sent' : 'failed',
    })
    if (res.success) {
      sent++
      await supabaseAdmin.from('bookings').update({ [dedupeCol]: new Date().toISOString() }).eq('id', b.id)
    }
  }

  console.log(`[booking-reminders] ${hoursOut}h window: sent ${sent} of ${bookings.length}`)
  return sent
}

export const bookingRemindersFunction = inngest.createFunction(
  { id: 'booking-reminders', name: 'Booking WhatsApp reminders' },
  { cron: '0 * * * *' },   // hourly
  async ({ step }) => {
    const cfg = await step.run('load-notification-config', async () => {
      const { data } = await supabaseAdmin
        .from('system_config')
        .select('value')
        .eq('key', 'notification_types_enabled')
        .single()
      return (data?.value ?? {}) as Record<string, boolean>
    })

    const enabled = cfg['booking_reminders'] !== false

    const sent24h = enabled
      ? await step.run('send-24h-reminders', () => sendRemindersForWindow(24, 'reminder_24h_sent_at', '24 hours'))
      : 0
    const sent2h = enabled
      ? await step.run('send-2h-reminders', () => sendRemindersForWindow(2, 'reminder_2h_sent_at', '2 hours'))
      : 0

    return { sent24h, sent2h }
  },
)
