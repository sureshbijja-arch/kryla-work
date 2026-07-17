/**
 * inngest/trial-watch.ts — Daily cron that monitors trial expiry.
 *
 * Trial model (1-month trial, no card at signup):
 *   Days 1–23 : free access, no action
 *   Days 24–27: reminder emails (7 days left)
 *   Days 28–30: alert emails (3 days left)
 *   After trial_ends_at + no subscription → plan_status = 'pending_payment' (restricted)
 *
 * Post-trial payment failures are handled event-driven in inngest/payment-alerts.ts.
 *
 * Registered in app/api/inngest/route.ts
 */

import { inngest } from '@/lib/inngest'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

// Days-remaining thresholds for trial reminders
const REMINDER_THRESHOLD_DAYS = 7   // 7 days left → reminder email
const ALERT_THRESHOLD_DAYS    = 3   // 3 days left → urgent alert

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export const trialWatchFunction = inngest.createFunction(
  { id: 'trial-watch', name: 'Trial expiry watcher' },
  { cron: '0 9 * * *' },  // daily at 09:00 UTC
  async ({ step }) => {
    // ── Step 1: Expire trials ───────────────────────────────────────────────
    const expiredCount = await step.run('expire-overdue-trials', async () => {
      const { data: overdue, error } = await supabaseAdmin
        .from('providers')
        .select('id')
        .eq('plan_status', 'trialing')
        .is('platform_subscription_id', null)   // no card added yet
        .lt('trial_ends_at', new Date().toISOString())

      if (error) {
        console.error('[trial-watch] expire query failed:', error.message)
        return 0
      }
      if (!overdue?.length) return 0

      const ids = overdue.map((p: { id: string }) => p.id)
      const { error: updateError } = await supabaseAdmin
        .from('providers')
        .update({ plan_status: 'pending_payment' })
        .in('id', ids)

      if (updateError) {
        console.error('[trial-watch] expire update failed:', updateError.message)
        return 0
      }

      console.log(`[trial-watch] expired ${ids.length} trial(s)`)
      return ids.length
    })

    // ── Step 2: Send urgent alert (trial ends in ≤ 3 days) ─────────────────
    const alertedCount = await step.run('send-trial-alert-emails', async () => {
      const { data: critical } = await supabaseAdmin
        .from('providers')
        .select('id, email, first_name, slug, trial_ends_at')
        .eq('plan_status', 'trialing')
        .is('platform_subscription_id', null)
        .gt('trial_ends_at', new Date().toISOString())
        .lt('trial_ends_at', daysFromNow(ALERT_THRESHOLD_DAYS))

      if (!critical?.length) return 0

      // Send urgent alert to providers with ≤ 3 days left
      let sent = 0
      for (const p of critical as { id: string; email: string | null; first_name: string; slug: string; trial_ends_at: string }[]) {
        if (!p.email) { console.log(`[trial-watch] no email for ${p.slug}, skipping`); continue }
        const daysLeft = Math.ceil((new Date(p.trial_ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        await sendEmail({
          to: p.email,
          subject: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left — add your card to keep your Kryla page`,
          html: `<div style="font-family:sans-serif;max-width:600px">
            <h2>Hi ${p.first_name},</h2>
            <p>Your free trial ends in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>. Add a payment method to keep your Kryla page live at kryla.work/${p.slug}.</p>
            <a href="https://kryla.work/${p.slug}/mykryla" style="display:inline-block;background:#0D0D0D;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Add payment method →</a>
            <p style="color:#999;font-size:12px;margin-top:24px">kryla.work · <a href="mailto:hello@kryla.work">hello@kryla.work</a></p>
          </div>`,
        })
        sent++
        console.log(`[trial-watch] urgent alert sent to ${p.slug} (${daysLeft} days left)`)
      }
      return sent
    })

    // ── Step 3: Send reminder (trial ends in 4–7 days) ───────────────────────
    const remindedCount = await step.run('send-trial-reminder-emails', async () => {
      const { data: reminders } = await supabaseAdmin
        .from('providers')
        .select('id, email, first_name, slug, trial_ends_at')
        .eq('plan_status', 'trialing')
        .is('platform_subscription_id', null)
        .gt('trial_ends_at', daysFromNow(ALERT_THRESHOLD_DAYS))
        .lt('trial_ends_at', daysFromNow(REMINDER_THRESHOLD_DAYS))

      if (!reminders?.length) return 0

      // Send reminder to providers with 4–7 days left
      let sent = 0
      for (const p of reminders as { id: string; email: string | null; first_name: string; slug: string; trial_ends_at: string }[]) {
        if (!p.email) { console.log(`[trial-watch] no email for ${p.slug}, skipping`); continue }
        const daysLeft = Math.ceil((new Date(p.trial_ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        await sendEmail({
          to: p.email,
          subject: `Your Kryla free trial ends in ${daysLeft} days — add a card to continue`,
          html: `<div style="font-family:sans-serif;max-width:600px">
            <h2>Hi ${p.first_name},</h2>
            <p>Your free trial ends in <strong>${daysLeft} days</strong>. Add a payment method now to keep your Kryla page live at kryla.work/${p.slug}.</p>
            <p>You can upgrade anytime from your dashboard — you'll only be charged at the end of the trial.</p>
            <a href="https://kryla.work/${p.slug}/mykryla" style="display:inline-block;background:#0D0D0D;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Go to My Space →</a>
            <p style="color:#999;font-size:12px;margin-top:24px">kryla.work · <a href="mailto:hello@kryla.work">hello@kryla.work</a></p>
          </div>`,
        })
        sent++
        console.log(`[trial-watch] reminder sent to ${p.slug} (${daysLeft} days left)`)
      }
      return sent
    })

    return { expiredCount, alertedCount, remindedCount }
  }
)
