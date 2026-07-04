-- Migration: billing_plan_pricing
-- Adds real integer pricing and gateway price-object IDs to the plans table.
-- The existing usa_price / india_price text columns remain as display-only strings.

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS usa_amount_cents   int  NULL,          -- e.g. 900 → $9.00
  ADD COLUMN IF NOT EXISTS india_amount_paise int  NULL,          -- e.g. 29900 → ₹299.00
  ADD COLUMN IF NOT EXISTS billing_interval   text NOT NULL DEFAULT 'month',
  ADD COLUMN IF NOT EXISTS stripe_price_id    text NULL,          -- price_xxx from Stripe dashboard
  ADD COLUMN IF NOT EXISTS razorpay_plan_id   text NULL;          -- plan_xxx from Razorpay

ALTER TABLE plans
  ADD CONSTRAINT plans_billing_interval_check
    CHECK (billing_interval IN ('month', 'year'));

COMMENT ON COLUMN plans.usa_amount_cents   IS 'Charge amount in USD cents (900 = $9.00). NULL means not billable (quote or free).';
COMMENT ON COLUMN plans.india_amount_paise IS 'Charge amount in INR paise (29900 = ₹299.00). NULL means not billable.';
COMMENT ON COLUMN plans.stripe_price_id    IS 'Stripe recurring Price ID (price_xxx). Set once after creating the Price in the Stripe dashboard.';
COMMENT ON COLUMN plans.razorpay_plan_id   IS 'Razorpay recurring Plan ID (plan_xxx). Set once after creating the Plan in Razorpay.';
