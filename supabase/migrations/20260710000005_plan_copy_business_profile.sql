-- Migration: 20260710000005_plan_copy_business_profile
-- Renames user-facing "page" → "business profile" in plan_features labels/descriptions.
-- Replaces the generic "Everything in Grow" Thrive row with two concrete Grow features.
-- All touched rows are display-only (feature_key NULL or unchanged); gating is unaffected.

-- ─── Grow: rename "page" → "business profile" ────────────────────────────────

UPDATE plan_features
SET    label       = 'Public business profile',
       description = 'Your own branded business profile at kryla.work/yourname'
WHERE  plan_id = 'grow'
  AND  label   = 'Public profile page';

UPDATE plan_features
SET    label       = 'Booking form on your business profile',
       description = 'Customers can request bookings directly from your business profile'
WHERE  plan_id = 'grow'
  AND  label   = 'Booking form on your page';

-- ─── Thrive: remove "Everything in Grow", add 2 concrete features ────────────

DELETE FROM plan_features
WHERE  plan_id = 'thrive'
  AND  label   = 'Everything in Grow';

INSERT INTO plan_features (plan_id, label, description, feature_key, sort_order)
VALUES
  ('thrive', 'Booking form on your business profile', 'Customers can request bookings directly from your business profile', NULL, 0),
  ('thrive', 'WhatsApp alert on new bookings',        'Get a WhatsApp notification for every new booking request',          NULL, 1)
ON CONFLICT (plan_id, label) DO NOTHING;

-- ─── Thrive: rename remaining "page" occurrences ─────────────────────────────

UPDATE plan_features
SET    label       = 'Update your business profile via WhatsApp',
       description = 'Edit your business profile content directly from a WhatsApp conversation'
WHERE  plan_id = 'thrive'
  AND  label   = 'Update your page via WhatsApp';

UPDATE plan_features
SET    label       = 'Scrolling ads on your business profile',
       description = 'Add promotional banners that scroll across the top of your business profile'
WHERE  plan_id = 'thrive'
  AND  label   = 'Scrolling ads on your page';

UPDATE plan_features
SET    label       = 'Online payments on your business profile',
       description = 'Accept payments directly through your Kryla business profile'
WHERE  plan_id = 'thrive'
  AND  label   = 'Online payments on your page';

UPDATE plan_features
SET    label       = 'Collect and display customer reviews on your business profile'
WHERE  plan_id = 'thrive'
  AND  label   = 'Collect and display customer reviews on your page';

-- Custom link description (set by 20260704000006_plan_features_cleanup.sql)
UPDATE plan_features
SET    description = 'Your business profile gets a personalized link — yourname.kryla.work'
WHERE  plan_id IN ('thrive', 'elevate')
  AND  description LIKE '%Your page gets a personalized link%';
