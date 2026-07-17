import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getGatewayForProvider } from '@/lib/payments'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kryla.work'

async function assertOwner(providerId: string, userEmail: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('providers')
    .select('id')
    .eq('id', providerId)
    .eq('email', userEmail)
    .maybeSingle()
  return !!data
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { providerId: string; targetPlan: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { providerId, targetPlan } = body
  if (!providerId || !targetPlan) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // ── Ownership ─────────────────────────────────────────────────────────────
  const ok = await assertOwner(providerId, user.email)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // ── Load provider ─────────────────────────────────────────────────────────
  const { data: provider } = await supabaseAdmin
    .from('providers')
    .select('id, email, first_name, last_name, region, plan, plan_status, stripe_customer_id, trial_ends_at, platform_subscription_id, slug, stripe_discount_coupon')
    .eq('id', providerId)
    .single()

  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  if (provider.region !== 'usa') {
    return NextResponse.json({
      error: 'Online checkout for India (Razorpay) is coming soon. Please contact support.',
    }, { status: 400 })
  }

  // ── Load target plan ──────────────────────────────────────────────────────
  const { data: plan } = await supabaseAdmin
    .from('plans')
    .select('id, is_quote, stripe_price_id, usa_amount_cents, stripe_coupon_id')
    .eq('id', targetPlan)
    .eq('active', true)
    .single()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  if (plan.is_quote) {
    return NextResponse.json({
      error: 'For Elevate pricing please contact hello@kryla.work',
    }, { status: 400 })
  }

  if (!plan.stripe_price_id) {
    return NextResponse.json({
      error: 'This plan is not yet available for online checkout. Please contact support.',
    }, { status: 400 })
  }

  // ── Guard: already on this plan and active ─────────────────────────────────
  if (
    provider.plan === targetPlan &&
    provider.plan_status === 'active' &&
    provider.platform_subscription_id
  ) {
    return NextResponse.json({ error: 'Already subscribed to this plan' }, { status: 400 })
  }

  // ── Gateway ───────────────────────────────────────────────────────────────
  const gateway = getGatewayForProvider(provider)

  // Ensure Stripe customer — create if needed, persist immediately
  let customerId = provider.stripe_customer_id as string | null
  if (!customerId) {
    const name = [provider.first_name, provider.last_name].filter(Boolean).join(' ')
    customerId = await gateway.createCustomer({
      email: (provider.email as string | null) ?? user.email,
      name:  name || user.email,
      metadata: { kryla_provider_id: providerId },
    })
    await supabaseAdmin
      .from('providers')
      .update({ stripe_customer_id: customerId })
      .eq('id', providerId)
  }

  // Trial end: defer first charge to provider's trial_ends_at
  let trialEnd: number | undefined
  if (provider.trial_ends_at) {
    const trialEndMs = new Date(provider.trial_ends_at as string).getTime()
    if (trialEndMs > Date.now()) {
      trialEnd = Math.floor(trialEndMs / 1000)
    }
  }

  const successUrl = `${APP_URL}/${provider.slug}/mykryla?billing=success`
  const cancelUrl  = `${APP_URL}/${provider.slug}/mykryla?billing=cancelled`

  // Effective coupon: member-level override > plan-level default > none (user-entered promo code)
  const couponId =
    (provider.stripe_discount_coupon as string | null) ??
    (plan.stripe_coupon_id as string | null) ??
    undefined

  const { url } = await gateway.createPlatformCheckout({
    customerId,
    priceId:   plan.stripe_price_id as string,
    planId:    targetPlan,
    providerId,
    trialEnd,
    successUrl,
    cancelUrl,
    couponId,
  })

  // Mark plan_pending so webhook knows which plan to apply on checkout.completed
  await supabaseAdmin
    .from('providers')
    .update({ plan_pending: targetPlan, billing_gateway: 'stripe' })
    .eq('id', providerId)

  return NextResponse.json({ url })
}
