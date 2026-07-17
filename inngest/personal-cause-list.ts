/**
 * inngest/personal-cause-list.ts — Daily cron: advocate personal cause-list digest.
 *
 * Cron: 30 12 * * *  (12:30 UTC = ~18:00 IST) — evening before.
 *
 * For each advocate who has cause_list_alerts_enabled = true:
 *   - Finds their watched_cases where next_hearing_date = tomorrow and status='active'
 *   - If 1+ matches: sends a WhatsApp digest to their own whatsapp_number
 *   - Writes to notifications table (type: 'cause_list_digest')
 *   - Sets cause_list_alert_sent_for = tomorrow (dedupe: safe on re-run)
 *   - Zero-matter advocates and disabled advocates: silently skip
 *
 * Respects system_config.notification_types_enabled.cause_list_digest global kill-switch.
 * Per-advocate opt-in is the real gate (cause_list_alerts_enabled column on providers).
 *
 * Mirrors the pattern in inngest/hearing-reminders.ts exactly (dedupe, notifications log).
 * Registered in app/api/inngest/route.ts.
 */

import { inngest }             from '@/lib/inngest'
import { supabaseAdmin }       from '@/lib/supabase/admin'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

/** Returns YYYY-MM-DD string for UTC date + offsetDays */
function isoDate(offsetDays: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

/** Format date as "15 Jul 2026" */
function friendlyDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export const personalCauseListFunction = inngest.createFunction(
  { id: 'personal-cause-list', name: 'Advocate personal cause-list digest' },
  { cron: '30 12 * * *' },    // 12:30 UTC = ~18:00 IST
  async ({ step }) => {
    // ── Check global kill-switch ──────────────────────────────────────────────
    const cfg = await step.run('load-notification-config', async () => {
      const { data } = await supabaseAdmin
        .from('system_config')
        .select('value')
        .eq('key', 'notification_types_enabled')
        .single()
      return (data?.value ?? {}) as Record<string, boolean>
    })

    if (cfg['cause_list_digest'] === false) {
      console.log('[personal-cause-list] disabled via system_config kill-switch')
      return { sent: 0, skipped: 0 }
    }

    const tomorrow = isoDate(1)

    // ── Load opted-in advocates due to send ────────────────────────────────────
    const advocates = await step.run('load-opted-in-advocates', async () => {
      const { data, error } = await supabaseAdmin
        .from('providers')
        .select('id, first_name, whatsapp_number, cause_list_alert_sent_for')
        .eq('cause_list_alerts_enabled', true)
        .not('whatsapp_number', 'is', null)

      if (error) {
        console.error('[personal-cause-list] advocates query failed:', error.message)
        return []
      }
      // Filter out already-sent-for-tomorrow (dedupe)
      return (data ?? []).filter(
        p => (p as Record<string, unknown>)['cause_list_alert_sent_for'] !== tomorrow
      )
    })

    if (!advocates.length) {
      console.log('[personal-cause-list] no opted-in advocates pending for', tomorrow)
      return { sent: 0, skipped: 0 }
    }

    let sent = 0
    let skipped = 0

    // ── Process each advocate ─────────────────────────────────────────────────
    for (const advocate of advocates) {
      const adv = advocate as {
        id: string
        first_name: string | null
        whatsapp_number: string | null
        cause_list_alert_sent_for: string | null
      }

      await step.run(`digest-advocate-${adv.id}`, async () => {
        // Fetch their watched cases for tomorrow
        const { data: cases, error } = await supabaseAdmin
          .from('watched_cases')
          .select('case_title, court_name, cnr, next_hearing_note')
          .eq('provider_id', adv.id)
          .eq('status', 'active')
          .eq('next_hearing_date', tomorrow)

        if (error) {
          console.error(`[personal-cause-list] watched_cases query failed for provider ${adv.id}:`, error.message)
          return
        }

        if (!cases?.length) {
          skipped++
          return
        }

        // Build the digest message
        const dateStr = friendlyDate(tomorrow)
        const lineItems = cases.map(c => {
          const title = c.case_title || c.cnr || 'Untitled matter'
          const court = c.court_name ? ` — ${c.court_name}` : ''
          const note  = c.next_hearing_note ? ` (${c.next_hearing_note})` : ''
          return `• ${title}${court}${note}`
        }).join('\n')

        const body = (
          `📋 *Your cause list for tomorrow, ${dateStr}*\n\n` +
          `${lineItems}\n\n` +
          `Manage watched cases: https://kryla.work/mykryla`
        )

        const res = await sendWhatsAppMessage({
          to:   adv.whatsapp_number!,
          text: body,
        })

        // Log to notifications table
        await supabaseAdmin.from('notifications').insert({
          provider_id: adv.id,
          student_id:  null,
          type:        'cause_list_digest',
          channel:     'whatsapp',
          recipient:   adv.whatsapp_number!,
          body,
          status:      res.success ? 'sent' : 'failed',
        })

        // Mark dedupe column
        await supabaseAdmin
          .from('providers')
          .update({ cause_list_alert_sent_for: tomorrow })
          .eq('id', adv.id)

        if (res.success) sent++
        else skipped++

        console.log(
          `[personal-cause-list] provider ${adv.id}: ${res.success ? 'sent' : 'failed'} ` +
          `— ${cases.length} matter(s) for ${tomorrow}`
        )
      })
    }

    console.log(`[personal-cause-list] done — sent: ${sent}, skipped/failed: ${skipped}`)
    return { sent, skipped }
  },
)
