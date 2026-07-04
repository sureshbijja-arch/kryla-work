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

      // TODO: send urgent alert email via lib/email.ts when RESEND_API_KEY is configured
      // Subject: "3 days left — add your card to keep access"
      console.log(`[trial-watch] urgent alert needed for ${critical.length} provider(s):`,
        critical.map((p: { slug: string; trial_ends_at: string }) => ({
          slug: p.slug, trial_ends_at: p.trial_ends_at,
        }))
      )
      return critical.length
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

      // TODO: send reminder email via lib/email.ts when RESEND_API_KEY is configured
      // Subject: "Your free trial ends in X days — add a card to continue"
      console.log(`[trial-watch] reminder needed for ${reminders.length} provider(s):`,
        reminders.map((p: { slug: string; trial_ends_at: string }) => ({
          slug: p.slug, trial_ends_at: p.trial_ends_at,
        }))
      )
      return reminders.length
    })

    return { expiredCount, alertedCount, remindedCount }
  }
)
