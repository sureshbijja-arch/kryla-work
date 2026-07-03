-- Plans admin: create plans + plan_features tables, seed initial data.
-- Run this in the Supabase SQL editor.

-- ─── 1. plans ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id          text        PRIMARY KEY,          -- 'grow' | 'thrive' | 'elevate' (matches providers.plan)
  name        text        NOT NULL,
  emoji       text        NOT NULL DEFAULT '',
  tagline     text        NOT NULL DEFAULT '',
  usa_price   text        NULL,                  -- NULL when is_quote = true
  india_price text        NULL,
  is_quote    boolean     NOT NULL DEFAULT false, -- true → "Contact for quote"
  popular     boolean     NOT NULL DEFAULT false,
  sort_order  int         NOT NULL DEFAULT 0,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. plan_features ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_features (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     text        NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  label       text        NOT NULL,
  description text        NULL,                  -- longer explanation shown in feature descriptions admin
  feature_key text        NULL,                  -- machine key for gating (e.g. 'ads', 'team')
  sort_order  int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS plan_features_plan_label ON plan_features(plan_id, label);
CREATE INDEX        IF NOT EXISTS plan_features_plan_order ON plan_features(plan_id, sort_order);

-- ─── 3. updated_at trigger on plans ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 4. Seed plans (idempotent) ──────────────────────────────────────────────
INSERT INTO plans (id, name, emoji, tagline, usa_price, india_price, is_quote, popular, sort_order)
VALUES
  ('grow',    'Grow',    '🌳', 'Get online & take bookings.',         '$9/mo',  '₹299/mo', false, false, 0),
  ('thrive',  'Thrive',  '🚀', 'Everything to grow your business.',   '$19/mo', '₹599/mo', false, true,  1),
  ('elevate', 'Elevate', '⚡', 'Built for you.',                       NULL,     NULL,      true,  false, 2)
ON CONFLICT (id) DO NOTHING;

-- ─── 5. Seed plan_features (idempotent) ──────────────────────────────────────
-- Grow features (no feature_key — all available to everyone at Grow tier)
INSERT INTO plan_features (plan_id, label, description, feature_key, sort_order) VALUES
  ('grow', 'Public profile page',             'Your own branded page at kryla.work/yourname', NULL,             0),
  ('grow', 'Booking form on your page',       'Customers can request bookings directly from your page', NULL,   1),
  ('grow', 'WhatsApp alert on new bookings',  'Get a WhatsApp notification for every new booking request', NULL, 2),
  ('grow', 'Upload profile photo & gallery',  'Add your photo and a gallery of your work', NULL,               3),
  ('grow', 'Analytics — see who''s visiting', 'Track page views and booking clicks', NULL,                     4)
ON CONFLICT (plan_id, label) DO NOTHING;

-- Thrive features
INSERT INTO plan_features (plan_id, label, description, feature_key, sort_order) VALUES
  ('thrive', 'Everything in Grow',              'All features from the Grow plan', NULL,                                              0),
  ('thrive', 'Your own custom domain (priya.com)', 'Connect your own domain to your Kryla page', 'custom_domain',                    1),
  ('thrive', 'Update your page via WhatsApp',   'Edit your page content directly from a WhatsApp conversation', 'whatsapp_edit',      2),
  ('thrive', 'Scrolling ads on your page',      'Add promotional banners that scroll across the top of your page', 'ads',             3),
  ('thrive', 'Review collection',               'Collect and display customer reviews on your page', 'reviews',                       4),
  ('thrive', 'Online payments on your page',    'Accept payments directly through your Kryla page', 'payments',                       5),
  ('thrive', 'Team access & branded email',     'Add team members and use a branded email address', 'team',                           6)
ON CONFLICT (plan_id, label) DO NOTHING;

-- Elevate features
INSERT INTO plan_features (plan_id, label, description, feature_key, sort_order) VALUES
  ('elevate', 'Everything in Thrive',                      'All features from the Thrive plan', NULL,        0),
  ('elevate', 'Custom changes built for your business',    'Bespoke features and integrations built to order', 'custom_work', 1)
ON CONFLICT (plan_id, label) DO NOTHING;
