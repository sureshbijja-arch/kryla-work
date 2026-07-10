/**
 * inngest/payment-alerts.ts — Event-driven payment failure notifications.
 *
 * Triggered by kryla/billing.payment.failed events emitted by the Stripe
 * webhook handler whenever a *distinct* invoice fails (retries on the same
 * invoice are deduped and do not fire this event again).
 *
 * failureCount 1 = first missed billing month → send reminder
 * failureCount 2 = second consecutive missed month → send urgent alert
 *
 * Access restriction itself happens via customer.subscription.deleted
 * (Stripe cancels after exhausting retries) → handleSubscriptionDeleted
 * in webhook-handlers.ts sets plan_status = 'cancelled'.
 */

import { inngest, BILLING_PAYMENT_FAILED_EVENT } from '@/lib/inngest'
import type { BillingPaymentFailedPayload } from '@/lib/inngest'
import { sendEmail } from '@/lib/email'

export const paymentAlertsFunction = inngest.createFunction(
  { id: 'payment-alerts', name: 'Payment failure alerts' },
  { event: BILLING_PAYMENT_FAILED_EVENT },
  async ({ event }) => {
    const {
      failureCount,
      periodEnd,
      email,
      firstName,
      slug,
    } = event.data as BillingPaymentFailedPayload

    if (!email) {
      console.log(`[payment-alerts] No email for ${slug}, skipping notification`)
      return { skipped: true }
    }

    const name = firstName ?? 'there'
    const periodEndStr = periodEnd
      ? new Date(periodEnd).toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
        })
      : 'soon'

    if (failureCount === 1) {
      // First missed month — friendly reminder
      console.log(`[payment-alerts] REMINDER → ${slug} (${email}): first payment missed. Period ends ${periodEndStr}.`)
      await sendEmail({
        to: email,
        subject: `Your Kryla payment didn't go through`,
        html: `<div style="font-family:sans-serif;max-width:600px">
          <h2>Hi ${name},</h2>
          <p>Your Kryla subscription payment didn't go through. No worries — you still have full access for now.</p>
          <p>Please update your payment method before <strong>${periodEndStr}</strong> to avoid any interruption.</p>
          <a href="https://kryla.work/${slug}/mychat" style="display:inline-block;background:#0D0D0D;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Update payment method →</a>
          <p style="color:#999;font-size:12px;margin-top:24px">kryla.work · <a href="mailto:hello@kryla.work">hello@kryla.work</a></p>
        </div>`,
      })
    } else if (failureCount >= 2) {
      // Second consecutive missed month — urgent: pay by period end or lose access
      console.log(`[payment-alerts] URGENT → ${slug} (${email}): 2nd payment missed. Access restricted at ${periodEndStr}.`)
      await sendEmail({
        to: email,
        subject: `Action required: pay by ${periodEndStr} to keep your Kryla access`,
        html: `<div style="font-family:sans-serif;max-width:600px">
          <h2>Hi ${name},</h2>
          <p>This is your second missed payment. Your access to your Kryla page will be restricted on <strong>${periodEndStr}</strong> unless you pay now.</p>
          <a href="https://kryla.work/${slug}/mychat" style="display:inline-block;background:#DC2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Pay now — keep my access →</a>
          <p style="color:#999;font-size:12px;margin-top:24px">Questions? Reply to this email or contact <a href="mailto:hello@kryla.work">hello@kryla.work</a></p>
        </div>`,
      })
    }

    return { failureCount, slug, email }
  }
)
