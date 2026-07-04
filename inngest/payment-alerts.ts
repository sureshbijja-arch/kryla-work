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
      console.log(
        `[payment-alerts] REMINDER → ${slug} (${email}): first payment missed. ` +
        `Period ends ${periodEndStr}.`
      )
      // TODO: send email via lib/email.ts when RESEND_API_KEY is configured
      // Subject: "Your Kryla payment didn't go through"
      // Body: Hey {name}, your {plan} subscription payment didn't go through.
      //       Please update your payment method at kryla.work/{slug}/mychat.
      //       You still have full access — just make sure to pay before {periodEndStr}.
    } else if (failureCount >= 2) {
      // Second consecutive missed month — urgent: pay by period end or lose access
      console.log(
        `[payment-alerts] URGENT ALERT → ${slug} (${email}): 2nd consecutive payment missed. ` +
        `Access will be restricted at ${periodEndStr}.`
      )
      // TODO: send email via lib/email.ts when RESEND_API_KEY is configured
      // Subject: "Action required: pay by {periodEndStr} to keep your Kryla access"
      // Body: Hey {name}, this is your second missed payment.
      //       Your access will be restricted on {periodEndStr} unless you pay now.
      //       Update your payment method: kryla.work/{slug}/mychat → My plan.
    }

    return { failureCount, slug, email }
  }
)
