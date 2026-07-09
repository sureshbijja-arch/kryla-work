-- Persona catalog — lightweight, admin-managed.
-- Rich behavioral config (onboarding questions, AI guidance) stays in code;
-- this table owns the catalog (enabled toggle, ordering, visual defaults).

CREATE TABLE IF NOT EXISTS personas (
  id           text PRIMARY KEY,          -- matches config/verticals key (tutor, baker …)
  label        text NOT NULL,
  emoji        text NOT NULL DEFAULT '',
  enabled      boolean NOT NULL DEFAULT true,
  sort_order   int     NOT NULL DEFAULT 0,
  template     text    NOT NULL DEFAULT 'focus',      -- focus | portfolio | clinic | storefront
  palette      text    NOT NULL DEFAULT 'professional', -- professional | fresh | warm | minimal | creative | calm
  font         text    NOT NULL DEFAULT 'inter',       -- inter | georgia | trebuchet
  needs_config boolean NOT NULL DEFAULT false,         -- true = admin-added, no code config yet
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Seed all 11 built-in personas (matches config/verticals/index.ts exactly)
INSERT INTO personas (id, label, emoji, enabled, sort_order, template, palette, font, needs_config) VALUES
  ('tutor',        'Tutor',           '📚', true,  1,  'focus',      'professional', 'inter',    false),
  ('trainer',      'Fitness trainer', '💪', true,  2,  'focus',      'fresh',        'inter',    false),
  ('baker',        'Baker',           '🧁', true,  3,  'portfolio',  'warm',         'georgia',  false),
  ('photographer', 'Photographer',    '📷', true,  4,  'portfolio',  'minimal',      'inter',    false),
  ('salon',        'Salon / stylist', '✂️', true,  5,  'storefront', 'creative',     'inter',    false),
  ('chef',         'Chef',            '🍱', true,  6,  'storefront', 'warm',         'georgia',  false),
  ('doctor',       'Doctor',          '🩺', true,  7,  'clinic',     'calm',         'inter',    false),
  ('musician',     'Music teacher',   '🎵', true,  8,  'focus',      'creative',     'inter',    false),
  ('advocate',     'Advocate',        '⚖️', true,  9,  'focus',      'professional', 'inter',    false),
  ('retailer',     'Retailer',        '🛍️', true, 10,  'storefront', 'creative',     'inter',    false),
  ('other',        'Something else',  '✨', true,  11, 'focus',      'professional', 'inter',    false)
ON CONFLICT (id) DO NOTHING;
