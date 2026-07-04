/**
 * lib/payments/webhook-handlers.ts — Shared DB update logic for billing webhooks.
 *
 * Both the Stripe and (future) Razorpay webhook routes import from here.
 * Each handler takes a ParsedWebhookEvent and updates the providers table
 * + inserts into payment_events.
 *
 * IMPORTANT: Always resolve providers by stored gateway customer/subscription IDs —
 * NEVER by email. Email is not unique in this system.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { inngest, BILLING_PAYMENT_FAILED_EVENT } from '@/lib/inngest'
import type { BillingPaymentFailedPayload } from '@/lib/inngest'
import type { ParsedWebhookEvent } from './types'

type Gateway = 'stripe' | 'razorpay'

// ── Provider resolution ───────────────────────────────────────────────────────

async function findProviderByCustomerId(
  gateway: Gateway,
  customerId: string
): Promise<{ id: string; plan: string; plan_pending: string | null } | null> {
  const column = gateway === 'stripe' ? 'stripe_customer_id' : 'razorpay_customer_id'
  const { data } = await supabaseAdmin
    .from('providers')
    .select('id, plan, plan_pending')
    .eq(column, customerId)
    .maybeSingle()
  return data
}

// ── Audit event insert ────────────────────────────────────────────────────────

async function insertPaymentEvent(params: {
  gateway:    Gateway
  eventType:  string
  providerId: string
  raw:        unknown
  amountMinor?: number
  currency?:    string
}) {
  const { error } = await supabaseAdmin.from('payment_events').insert({
    scope:        'platform',
    provider_id:  params.providerId,
    gateway:      params.gateway,
    event_type:   params.eventType,
    amount_minor: params.amountMinor ?? null,
    currency:     params.currency    ?? null,
    raw:          params.raw as Record<string, unknown>,
  })
  if (error) {
    console.error('[webhook-handlers] payment_events insert failed:', error.message)
  }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

/**
 * checkout.session.completed (subscription mode).
 * Sets platform_subscription_id and applies plan_pending if present.
 */
export async function handleCheckoutCompleted(
  gateway: Gateway,
  event:   ParsedWebhookEvent
): Promise<void> {
  const { customerId, subscriptionId, planId, providerId } = event

  // Prefer resolving by providerId stored in metadata, fall back to customerId lookup
  let provider: { id: string; plan: string; plan_pending: string | null } | null = null

  if (providerId) {
    const { data } = await supabaseAdmin
      .from('providers')
      .select('id, plan, plan_pending')
      .eq('id', providerId)
      .maybeSingle()
    provider = data
  } else if (customerId) {
    provider = await findProviderByCustomerId(gateway, customerId)
  }

  if (!provider) {
    console.error('[webhook-handlers] handleCheckoutCompleted: provider not found',
      { customerId, providerId })
    return
  }

  const newPlan = planId ?? provider.plan_pending ?? provider.plan

  const { error } = await supabaseAdmin.from('providers').update({
    platform_subscription_id: subscriptionId ?? null,
    billing_gateway:          gateway,
    plan:                     newPlan,
    plan_status:              'trialing',
    plan_pending:             null,
  }).eq('id', provider.id)

  if (error) console.error('[webhook-handlers] checkout update failed:', error.message)

  await insertPaymentEvent({
    gateway,
    eventType:  'platform.checkout.completed',
    providerId: provider.id,
    raw:        event.raw,
  })
}

/**
 * customer.subscription.updated / created.
 * Drives plan_status state machine.
 */
export async function handleSubscriptionUpdated(
  gateway: Gateway,
  event:   ParsedWebhookEvent
): Promise<void> {
  const { customerId, subscriptionId, subscriptionStatus, periodEnd, planId, providerId } = event

  let provider: { id: string; plan: string; plan_pending: string | null } | null = null

  if (providerId) {
    const { data } = await supabaseAdmin
      .from('providers')
      .select('id, plan, plan_pending')
      .eq('id', providerId)
      .maybeSingle()
    provider = data
  } else if (customerId) {
    provider = await findProviderByCustomerId(gateway, customerId)
  }

  if (!provider) {
    console.error('[webhook-handlers] handleSubscriptionUpdated: provider not found',
      { customerId, subscriptionId })
    return
  }

  // Map raw gateway status → our plan_status values
  const statusMap: Record<string, string> = {
    trialing:    'trialing',
    active:      'active',
    past_due:    'past_due',
    canceled:    'cancelled',     // Stripe uses 'canceled' (one l)
    cancelled:   'cancelled',
    unpaid:      'past_due',
    paused:      'past_due',
    incomplete:  'pending_payment',
    incomplete_expired: 'cancelled',
  }
  const newStatus = statusMap[subscriptionStatus ?? ''] ?? 'pending_payment'

  const updates: Record<string, unknown> = {
    plan_status:    newStatus,
    plan_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
  }

  // Apply pending plan upgrade/downgrade when the subscription goes active
  if (newStatus === 'active' && provider.plan_pending) {
    updates.plan         = provider.plan_pending
    updates.plan_pending = null
  } else if (planId && planId !== provider.plan && newStatus === 'trialing') {
    // Plan changed during trial (e.g. user upgraded)
    updates.plan = planId
  }

  const { error } = await supabaseAdmin.from('providers').update(updates).eq('id', provider.id)
  if (error) console.error('[webhook-handlers] subscription update failed:', error.message)

  await insertPaymentEvent({
    gateway,
    eventType:  event.eventType,
    providerId: provider.id,
    raw:        event.raw,
  })
}

/**
 * customer.subscription.deleted.
 * Marks the provider as cancelled and clears the subscription ID.
 */
export async function handleSubscriptionDeleted(
  gateway: Gateway,
  event:   ParsedWebhookEvent
): Promise<void> {
  const { customerId, providerId } = event

  let provider: { id: string; plan: string; plan_pending: string | null } | null = null

  if (providerId) {
    const { data } = await supabaseAdmin
      .from('providers')
      .select('id, plan, plan_pending')
      .eq('id', providerId)
      .maybeSingle()
    provider = data
  } else if (customerId) {
    provider = await findProviderByCustomerId(gateway, customerId)
  }

  if (!provider) {
    console.error('[webhook-handlers] handleSubscriptionDeleted: provider not found',
      { customerId, providerId })
    return
  }

  const { error } = await supabaseAdmin.from('providers').update({
    plan_status:              'cancelled',
    platform_subscription_id: null,
    plan_pending:             null,
  }).eq('id', provider.id)

  if (error) console.error('[webhook-handlers] subscription delete update failed:', error.message)

  await insertPaymentEvent({
    gateway,
    eventType:  'platform.subscription.cancelled',
    providerId: provider.id,
    raw:        event.raw,
  })
}

/**
 * invoice.payment_succeeded.
 * Resets the consecutive failure counter and confirms active status.
 */
export async function handleInvoicePaymentSucceeded(
  gateway: Gateway,
  event:   ParsedWebhookEvent
): Promise<void> {
  const { customerId, providerId } = event

  let provider: { id: string } | null = null

  if (providerId) {
    const { data } = await supabaseAdmin
      .from('providers').select('id').eq('id', providerId).maybeSingle()
    provider = data
  } else if (customerId) {
    const col = gateway === 'stripe' ? 'stripe_customer_id' : 'razorpay_customer_id'
    const { data } = await supabaseAdmin
      .from('providers').select('id').eq(col, customerId).maybeSingle()
    provider = data
  }

  if (!provider) return

  // Reset failure tracking on any successful payment
  const { error } = await supabaseAdmin.from('providers').update({
    plan_status:                  'active',
    consecutive_payment_failures: 0,
    last_payment_failed_invoice:  null,
  }).eq('id', provider.id)

  if (error) console.error('[webhook-handlers] invoice succeeded update failed:', error.message)

  await insertPaymentEvent({
    gateway,
    eventType:   'platform.subscription.active',
    providerId:  provider.id,
    raw:         event.raw,
    amountMinor: event.amountMinor,
    currency:    event.currency,
  })
}

/**
 * invoice.payment_failed.
 *
 * Deduplicates by invoiceId so Stripe's retry attempts within the same billing
 * period count as one failure, not many. Each distinct invoice failure = one
 * missed billing month.
 *
 *   failureCount 1 → past_due + reminder emails (via Inngest)
 *   failureCount 2 → urgent alert + Stripe will cancel → subscription.deleted
 *                    restricts access (handled by handleSubscriptionDeleted)
 */
export async function handleInvoicePaymentFailed(
  gateway: Gateway,
  event:   ParsedWebhookEvent
): Promise<void> {
  const { customerId, providerId, invoiceId, periodEnd } = event

  const col = gateway === 'stripe' ? 'stripe_customer_id' : 'razorpay_customer_id'

  let provider: {
    id: string
    email: string | null
    first_name: string | null
    slug: string
    consecutive_payment_failures: number
    last_payment_failed_invoice: string | null
  } | null = null

  if (providerId) {
    const { data } = await supabaseAdmin
      .from('providers')
      .select('id, email, first_name, slug, consecutive_payment_failures, last_payment_failed_invoice')
      .eq('id', providerId)
      .maybeSingle()
    provider = data
  } else if (customerId) {
    const { data } = await supabaseAdmin
      .from('providers')
      .select('id, email, first_name, slug, consecutive_payment_failures, last_payment_failed_invoice')
      .eq(col, customerId)
      .maybeSingle()
    provider = data
  }

  if (!provider) return

  // Dedup: Stripe retries the same invoice multiple times — only count a new invoice
  const isNewInvoice = !invoiceId || invoiceId !== provider.last_payment_failed_invoice
  const newFailureCount = isNewInvoice
    ? (provider.consecutive_payment_failures ?? 0) + 1
    : provider.consecutive_payment_failures

  const updates: Record<string, unknown> = { plan_status: 'past_due' }
  if (isNewInvoice) {
    updates.consecutive_payment_failures = newFailureCount
    updates.last_payment_failed_invoice  = invoiceId ?? null
  }

  const { error } = await supabaseAdmin.from('providers').update(updates).eq('id', provider.id)
  if (error) console.error('[webhook-handlers] invoice failed update failed:', error.message)

  await insertPaymentEvent({
    gateway,
    eventType:  'platform.subscription.past_due',
    providerId: provider.id,
    raw:        event.raw,
  })

  // Fire Inngest event once per distinct invoice failure so emails go out promptly
  if (isNewInvoice) {
    const periodEndIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null
    await inngest.send({
      name: BILLING_PAYMENT_FAILED_EVENT,
      data: {
        providerId:   provider.id,
        failureCount: newFailureCount,
        periodEnd:    periodEndIso,
        email:        provider.email,
        firstName:    provider.first_name,
        slug:         provider.slug,
      } satisfies BillingPaymentFailedPayload,
    })
  }
}
