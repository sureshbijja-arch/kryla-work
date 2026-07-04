/**
 * lib/payments/types.ts — Gateway-agnostic interfaces for the Kryla payments module.
 *
 * All route handlers work against PaymentGateway; gateway selection is done
 * by getGatewayForProvider() in lib/payments/index.ts.
 */

export type Gateway = 'stripe' | 'razorpay'
export type Region  = 'usa'    | 'india'

// ── Normalised event vocabulary ───────────────────────────────────────────────
// Route handlers switch on these strings, never on raw gateway event names.

export type NormalizedEventType =
  | 'platform.checkout.completed'       // user finished checkout; subscription in trialing
  | 'platform.subscription.trialing'    // subscription transitioned to / confirmed trialing
  | 'platform.subscription.active'      // first/renewal payment succeeded; subscription live
  | 'platform.subscription.past_due'    // payment failed; subscription at risk
  | 'platform.subscription.cancelled'   // subscription ended (manual or non-payment)
  | 'unknown'                           // event not handled by this adapter

// ── Provider shape expected by gateway methods ────────────────────────────────

export interface ProviderBillingInfo {
  id:                    string
  email:                 string | null
  first_name:            string | null
  last_name:             string | null
  region:                string
  plan:                  string
  plan_status:           string
  stripe_customer_id:    string | null
  razorpay_customer_id:  string | null
  trial_ends_at:         string | null
  platform_subscription_id: string | null
  slug:                  string
}

// ── Platform checkout params ──────────────────────────────────────────────────

export interface PlatformCheckoutParams {
  customerId:  string   // gateway customer ID (already persisted)
  priceId:     string   // gateway recurring price / plan ID
  planId:      string   // Kryla plan ID (grow/thrive) — stored in metadata for webhook use
  providerId:  string   // Kryla provider UUID — stored in metadata for webhook resolution
  trialEnd:    number | undefined  // Unix timestamp (seconds); undefined = bill immediately
  successUrl:  string
  cancelUrl:   string
  /** Stripe coupon ID to apply programmatically. When set, allow_promotion_codes is disabled. */
  couponId?:   string
}

export interface PlatformCheckoutResult {
  url:       string   // hosted checkout redirect URL
  sessionId: string   // gateway session/order ID
}

// ── Parsed webhook result ─────────────────────────────────────────────────────

export interface ParsedWebhookEvent {
  eventId:    string               // gateway event ID (for idempotency dedup)
  eventType:  NormalizedEventType
  raw:        unknown              // full raw event for audit storage

  // Populated depending on event type:
  customerId?:      string         // gateway customer ID
  subscriptionId?:  string         // gateway subscription ID
  subscriptionStatus?: string      // raw gateway status string
  periodEnd?:       number         // Unix timestamp of current_period_end
  planId?:          string         // Kryla plan ID from metadata
  providerId?:      string         // Kryla provider UUID from metadata
  amountMinor?:     number
  currency?:        string
}

// ── Gateway interface ─────────────────────────────────────────────────────────

export interface PaymentGateway {
  readonly id: Gateway

  /**
   * Create a new customer in the gateway and return the gateway customer ID.
   * Call only when the provider has no existing customer ID.
   */
  createCustomer(params: {
    email:     string
    name:      string
    metadata?: Record<string, string>
  }): Promise<string>

  /**
   * Create a hosted-checkout session for a platform subscription.
   * Returns a redirect URL for the member.
   */
  createPlatformCheckout(params: PlatformCheckoutParams): Promise<PlatformCheckoutResult>

  /**
   * Verify the webhook signature and parse the raw payload into a
   * normalised ParsedWebhookEvent. Throws on invalid signature.
   */
  verifyAndParse(
    rawBody:   string,
    headers:   Record<string, string | string[] | undefined>
  ): ParsedWebhookEvent
}
