/**
 * lib/payments/index.ts — Gateway factory.
 *
 * Route handlers call getGatewayForProvider() and work against the PaymentGateway
 * interface — they never import Stripe or Razorpay directly.
 *
 * Phase 3 adds getStripeAdapter() | getRazorpayAdapter() selection for India region.
 */

import type { PaymentGateway, Region } from './types'
import { getStripeAdapter } from './stripe-adapter'

/**
 * Returns the correct gateway adapter for a given region.
 * Throws an informative error for regions not yet implemented.
 */
export function getGatewayForRegion(region: Region | string): PaymentGateway {
  if (region === 'usa') return getStripeAdapter()
  // Phase 3: if (region === 'india') return getRazorpayAdapter()
  throw new Error(`Payment gateway for region '${region}' is not yet implemented.`)
}

/**
 * Returns the gateway for a provider, based on providers.region.
 * Convenience wrapper over getGatewayForRegion.
 */
export function getGatewayForProvider(provider: { region: string }): PaymentGateway {
  return getGatewayForRegion(provider.region)
}

// Re-export types + adapters for convenience
export type { PaymentGateway, ParsedWebhookEvent, NormalizedEventType } from './types'
export { getStripeAdapter } from './stripe-adapter'
