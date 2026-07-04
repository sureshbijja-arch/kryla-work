-- Migration: provider_billing
-- Adds trial tracking and subscription lifecycle columns to providers.
-- Also expands plan_status check constraint to include 'trialing'.

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS trial_ends_at            timestamptz NULL,
  ADD COLUMN IF NOT EXISTS billing_gateway          text        NULL,
  ADD COLUMN IF NOT EXISTS platform_subscription_id text        NULL,
  ADD COLUMN IF NOT EXISTS plan_period_end          timestamptz NULL,
  ADD COLUMN IF NOT EXISTS plan_pending             text        NULL;

ALTER TABLE providers
  ADD CONSTRAINT providers_billing_gateway_check
    CHECK (billing_gateway IN ('stripe', 'razorpay'));

-- Rebuild plan_status constraint to add 'trialing'
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_plan_status_check;
ALTER TABLE providers ADD CONSTRAINT providers_plan_status_check
  CHECK (plan_status IN ('trialing', 'active', 'pending_payment', 'past_due', 'cancelled'));

CREATE INDEX IF NOT EXISTS providers_platform_sub_idx
  ON providers(platform_subscription_id)
  WHERE platform_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS providers_trial_ends_at_idx
  ON providers(trial_ends_at)
  WHERE plan_status = 'trialing';

COMMENT ON COLUMN providers.trial_ends_at            IS 'End of free trial period. First charge lands at this time. NULL = no trial.';
COMMENT ON COLUMN providers.billing_gateway          IS 'Which gateway manages the platform subscription: stripe | razorpay';
COMMENT ON COLUMN providers.platform_subscription_id IS 'Stripe sub_xxx or Razorpay sub_xxx for the Kryla plan subscription.';
COMMENT ON COLUMN providers.plan_period_end          IS 'End of the current billing period (from gateway). Used for cancellation-at-period-end UX.';
COMMENT ON COLUMN providers.plan_pending             IS 'Target plan for a scheduled upgrade/downgrade. Applied when the gateway confirms the change.';
