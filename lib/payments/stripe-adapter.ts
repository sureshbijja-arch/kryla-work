/**
 * lib/payments/stripe-adapter.ts — Stripe implementation of PaymentGateway.
 *
 * Used for providers with region='usa'. Wraps the lazy stripe singleton
 * from lib/stripe.ts.
 */

import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import type {
  Gateway,
  PaymentGateway,
  PlatformCheckoutParams,
  PlatformCheckoutResult,
  ParsedWebhookEvent,
  NormalizedEventType,
} from './types'

// Map Stripe subscription statuses → normalised event types
function stripeStatusToNormalized(status: Stripe.Subscription.Status): NormalizedEventType {
  switch (status) {
    case 'trialing':    return 'platform.subscription.trialing'
    case 'active':      return 'platform.subscription.active'
    case 'past_due':    return 'platform.subscription.past_due'
    case 'canceled':    return 'platform.subscription.cancelled'
    case 'unpaid':      return 'platform.subscription.past_due'
    case 'paused':      return 'platform.subscription.past_due'
    default:            return 'unknown'
  }
}

export class StripeAdapter implements PaymentGateway {
  readonly id: Gateway = 'stripe'

  // ── Customer ──────────────────────────────────────────────────────────────

  async createCustomer(params: {
    email:     string
    name:      string
    metadata?: Record<string, string>
  }): Promise<string> {
    const customer = await stripe.customers.create({
      email:    params.email,
      name:     params.name,
      metadata: params.metadata ?? {},
    })
    return customer.id
  }

  // ── Platform checkout ─────────────────────────────────────────────────────

  async createPlatformCheckout(
    params: PlatformCheckoutParams
  ): Promise<PlatformCheckoutResult> {
    // Stripe requires: either `discounts` (programmatic coupon) OR `allow_promotion_codes`,
    // never both. If a coupon is provided, apply it silently; otherwise show the promo-code field.
    const discountParams: Partial<Stripe.Checkout.SessionCreateParams> = params.couponId
      ? { discounts: [{ coupon: params.couponId }] }
      : { allow_promotion_codes: true }

    const session = await stripe.checkout.sessions.create({
      mode:     'subscription',
      customer: params.customerId,
      line_items: [{
        price:    params.priceId,
        quantity: 1,
      }],
      subscription_data: {
        ...(params.trialEnd !== undefined && { trial_end: params.trialEnd }),
        metadata: {
          kryla_plan_id:     params.planId,
          kryla_provider_id: params.providerId,
        },
      },
      metadata: {
        kryla_plan_id:     params.planId,
        kryla_provider_id: params.providerId,
      },
      ...discountParams,
      success_url: params.successUrl,
      cancel_url:  params.cancelUrl,
    })

    return {
      url:       session.url!,
      sessionId: session.id,
    }
  }

  // ── Webhook verification + parsing ────────────────────────────────────────

  verifyAndParse(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
  ): ParsedWebhookEvent {
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET env var')

    const sig = headers['stripe-signature']
    const sigStr = Array.isArray(sig) ? sig[0] : (sig ?? '')

    // constructEvent throws on invalid signature — caller should catch and 400
    const event = stripe.webhooks.constructEvent(rawBody, sigStr, secret)

    return this.parseStripeEvent(event)
  }

  private parseStripeEvent(event: Stripe.Event): ParsedWebhookEvent {
    const base: ParsedWebhookEvent = {
      eventId:   event.id,
      eventType: 'unknown',
      raw:       event,
    }

    switch (event.type) {
      // ── Checkout session completed (subscription mode) ──────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') return base

        const customerId     = typeof session.customer    === 'string' ? session.customer    : undefined
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : undefined
        const meta = session.metadata ?? {}

        return {
          ...base,
          eventType:      'platform.checkout.completed',
          customerId,
          subscriptionId,
          planId:         meta.kryla_plan_id     ?? undefined,
          providerId:     meta.kryla_provider_id ?? undefined,
        }
      }

      // ── Subscription created / updated ──────────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : undefined
        const meta = (sub.metadata ?? {}) as Record<string, string>

        return {
          ...base,
          eventType:           stripeStatusToNormalized(sub.status),
          customerId,
          subscriptionId:      sub.id,
          subscriptionStatus:  sub.status,
          periodEnd:           sub.current_period_end,
          planId:              meta.kryla_plan_id     ?? undefined,
          providerId:          meta.kryla_provider_id ?? undefined,
        }
      }

      // ── Subscription deleted ─────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : undefined

        return {
          ...base,
          eventType:          'platform.subscription.cancelled',
          customerId,
          subscriptionId:     sub.id,
          subscriptionStatus: sub.status,
        }
      }

      // ── Invoice payment succeeded ────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId     = typeof invoice.customer     === 'string' ? invoice.customer     : undefined
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : undefined

        return {
          ...base,
          eventType:      'platform.subscription.active',
          customerId,
          subscriptionId,
          invoiceId:      invoice.id,
          amountMinor:    invoice.amount_paid,
          currency:       invoice.currency,
        }
      }

      // ── Invoice payment failed ───────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId     = typeof invoice.customer     === 'string' ? invoice.customer     : undefined
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : undefined

        return {
          ...base,
          eventType:      'platform.subscription.past_due',
          customerId,
          subscriptionId,
          invoiceId:      invoice.id,
          // period_end = when this billing period closes (the "pay by" deadline)
          periodEnd:      invoice.period_end ?? undefined,
        }
      }

      default:
        return base
    }
  }
}

// Singleton instance — created on first import (lazy, no env vars at import time)
let _adapter: StripeAdapter | null = null
export function getStripeAdapter(): StripeAdapter {
  if (!_adapter) _adapter = new StripeAdapter()
  return _adapter
}
