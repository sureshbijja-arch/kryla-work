/**
 * inngest/trial-watch.ts — Daily cron that monitors trial expiry.
 *
 * Trial model (3-month trial, no card at signup):
 *   Month 1–2 : free access, reminder emails sent
 *   Month 3   : alert emails — access will be restricted at trial_ends_at
 *   After trial_ends_at + no subscription → plan_status = 'pending_payment' (restricted)
 *
 * Registered in app/api/inngest/route.ts
 */

import { inngest } from '@/lib/inngest'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Days-remaining thresholds
const REMINDER_THRESHOLD_DAYS  = 60  // end of month 1 → start reminder emails
const ALERT_THRESHOLD_DAYS     = 30  // end of month 2 → urgent alert (month 3)

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

    // ── Step 2: Send month-3 alert (trial ends in ≤ 30 days) ───────────────
    const alertedCount = await step.run('send-month3-alerts', async () => {
      const { data: soonExpiring } = await supabaseAdmin
        .from('providers')
        .select('id, email, first_name, slug, trial_ends_at')
        .eq('plan_status', 'trialing')
        .is('platform_subscription_id', null)
        .gt('trial_ends_at', new Date().toISOString())
        .lt('trial_ends_at', daysFromNow(ALERT_THRESHOLD_DAYS))

      if (!soonExpiring?.length) return 0

      // TODO: send alert email via lib/email.ts when RESEND_API_KEY is configured
      // For now, log providers that need alerts
      console.log(`[trial-watch] month-3 alert needed for ${soonExpiring.length} provider(s):`,
        soonExpiring.map((p: { slug: string; trial_ends_at: string }) => ({
          slug: p.slug,
          trial_ends_at: p.trial_ends_at,
        }))
      )
      return soonExpiring.length
    })

    // ── Step 3: Send month-1/2 reminders (trial ends in 31–60 days) ─────────
    const remindedCount = await step.run('send-reminder-emails', async () => {
      const { data: reminders } = await supabaseAdmin
        .from('providers')
        .select('id, email, first_name, slug, trial_ends_at')
        .eq('plan_status', 'trialing')
        .is('platform_subscription_id', null)
        .gt('trial_ends_at', daysFromNow(ALERT_THRESHOLD_DAYS))
        .lt('trial_ends_at', daysFromNow(REMINDER_THRESHOLD_DAYS))

      if (!reminders?.length) return 0

      // TODO: send reminder email via lib/email.ts when RESEND_API_KEY is configured
      console.log(`[trial-watch] reminder needed for ${reminders.length} provider(s):`,
        reminders.map((p: { slug: string; trial_ends_at: string }) => ({
          slug: p.slug,
          trial_ends_at: p.trial_ends_at,
        }))
      )
      return reminders.length
    })

    return { expiredCount, alertedCount, remindedCount }
  }
)
