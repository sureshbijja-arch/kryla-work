-- Simplify plan model: seed/sprout/grow/thrive/elevate → grow/thrive/elevate
-- Run this in the Supabase SQL editor.

-- 1. Migrate any legacy plan values to the new floor plan (grow)
UPDATE providers SET plan = 'grow' WHERE plan IN ('seed', 'sprout');

-- 2. Rebuild the plan check constraint
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_plan_check;
ALTER TABLE providers ADD  CONSTRAINT providers_plan_check
  CHECK (plan IN ('grow', 'thrive', 'elevate'));
ALTER TABLE providers ALTER COLUMN plan SET DEFAULT 'grow';

-- 3. Fix plan_status: add 'pending_payment' (written by the invite-only submit route)
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_plan_status_check;
ALTER TABLE providers ADD  CONSTRAINT providers_plan_status_check
  CHECK (plan_status IN ('active', 'pending_payment', 'past_due', 'cancelled'));
