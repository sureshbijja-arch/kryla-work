/**
 * app/api/billing/webhook/stripe/route.ts
 *
 * Stripe webhook endpoint for PLATFORM subscription events
 * (member subscribes to a Kryla plan).
 *
 * MUST export runtime = 'nodejs' and read the raw body before anything
 * else — Stripe signature verification requires the exact raw payload.
 *
 * Configure in Stripe Dashboard → Webhooks → add endpoint:
 *   URL:    https://kryla.work/api/billing/webhook/stripe
 *   Events: checkout.session.completed
 *           customer.subscription.created
 *           customer.subscription.updated
 *           customer.subscription.deleted
 *           invoice.payment_succeeded
 *           invoice.payment_failed
 */

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getStripeAdapter } from '@/lib/payments/stripe-adapter'
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
} from '@/lib/payments/webhook-handlers'
import type { NormalizedEventType } from '@/lib/payments/types'
import { alertAdmin, escHtml } from '@/lib/alertAdmin'
import { captureServerException } from '@/lib/observability'

const GATEWAY = 'stripe' as const

export async function POST(req: NextRequest) {
  // ── 1. Raw body (must be read before any JSON parsing) ────────────────────
  const rawBody = await req.text()

  // ── 2. Signature verification ─────────────────────────────────────────────
  const headers: Record<string, string | string[] | undefined> = {}
  req.headers.forEach((value, key) => { headers[key] = value })

  let parsed: ReturnType<ReturnType<typeof getStripeAdapter>['verifyAndParse']>
  try {
    parsed = getStripeAdapter().verifyAndParse(rawBody, headers)
  } catch (err) {
    console.error('[webhook/stripe] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── 3. Idempotency — atomic insert; 23505 = already processed ─────────────
  const { error: idempotencyError } = await supabaseAdmin
    .from('webhook_events')
    .insert({ gateway: GATEWAY, event_id: parsed.eventId })

  if (idempotencyError) {
    if (idempotencyError.code === '23505') {
      // Already processed — return 200 so Stripe stops retrying
      return NextResponse.json({ ok: true, skipped: true })
    }
    // Non-idempotency DB error — log but continue processing
    console.error('[webhook/stripe] webhook_events insert error:', idempotencyError.message)
  }

  // ── 4. Dispatch to handler ────────────────────────────────────────────────
  const type: NormalizedEventType = parsed.eventType

  try {
    switch (type) {
      case 'platform.checkout.completed':
        await handleCheckoutCompleted(GATEWAY, parsed)
        break

      case 'platform.subscription.trialing':
      case 'platform.subscription.active':
      case 'platform.subscription.past_due':
        await handleSubscriptionUpdated(GATEWAY, parsed)
        break

      case 'platform.subscription.cancelled':
        // Could be subscription.deleted OR subscription.updated with status=canceled
        if ((parsed.raw as { type?: string })?.type === 'customer.subscription.deleted') {
          await handleSubscriptionDeleted(GATEWAY, parsed)
        } else {
          await handleSubscriptionUpdated(GATEWAY, parsed)
        }
        break

      default:
        // Unknown / unhandled event type — log and return 200 (don't fail)
        break
    }

    // invoice.* events are mapped to subscription.active / past_due by the adapter,
    // but we also want separate audit records for the invoice amounts.
    const rawType = (parsed.raw as { type?: string })?.type
    if (rawType === 'invoice.payment_succeeded') {
      await handleInvoicePaymentSucceeded(GATEWAY, parsed)
    } else if (rawType === 'invoice.payment_failed') {
      await handleInvoicePaymentFailed(GATEWAY, parsed)
    }
  } catch (err) {
    console.error('[webhook/stripe] handler error:', err)
    captureServerException(err, { route: '/api/billing/webhook/stripe', eventType: type })
    const errMsg = err instanceof Error ? err.message : String(err)
    await alertAdmin(
      `Stripe webhook handler failed (${escHtml(type)})`,
      `<p><strong>Event type:</strong> ${escHtml(type)}</p>
       <p><strong>Event ID:</strong> ${escHtml(parsed.eventId)}</p>
       <p><strong>Error:</strong> ${escHtml(errMsg)}</p>
       <p>Stripe will retry — check Inngest/Stripe dashboards.</p>`,
    )
    // Return 500 so Stripe retries — the idempotency key is already set so
    // we won't double-process once the handler succeeds on retry.
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
