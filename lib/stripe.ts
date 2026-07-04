/**
 * lib/stripe.ts — Lazy Stripe SDK singleton.
 *
 * Mirrors the lazy-Proxy pattern from lib/supabase/admin.ts so blank env
 * vars at build time don't crash Next.js compilation.
 *
 * Usage (server-only):
 *   import { stripe } from '@/lib/stripe'
 *   const customer = await stripe.customers.create(...)
 */

import Stripe from 'stripe'

let _stripe: Stripe | null = null

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (!_stripe) {
      const key = process.env.STRIPE_SECRET_KEY
      if (!key) throw new Error('Missing STRIPE_SECRET_KEY env var')
      _stripe = new Stripe(key, {
        // Pinned to a stable API version compatible with stripe ^15.
        // Update this string when upgrading the SDK.
        apiVersion: '2024-04-10',
        typescript: true,
      })
    }
    return (_stripe as unknown as Record<string | symbol, unknown>)[prop]
  },
})
