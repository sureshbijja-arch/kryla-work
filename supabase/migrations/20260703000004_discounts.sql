-- Discount / coupon support for platform billing
--
-- Plan-level:   plans.stripe_coupon_id   — auto-applied to every checkout for that plan
--               (e.g. "50% off grow at launch")
--
-- Member-level: providers.stripe_discount_coupon — overrides the plan-level coupon for
--               a specific member (e.g. "founder 40% off").  Set via Supabase dashboard.
--
-- Checkout logic:
--   1. If providers.stripe_discount_coupon is set  → use that (member override)
--   2. Else if plans.stripe_coupon_id is set        → use that (plan default)
--   3. Else                                          → allow_promotion_codes = true
--      (Stripe shows a promo-code field; mutually exclusive with programmatic discounts)

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS stripe_coupon_id text NULL;

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS stripe_discount_coupon text NULL;
