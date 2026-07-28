-- supabase/migrations/20260728150000_layout_presets_theme_columns.sql
--
-- Design refresh: layout_presets gains real theme data (design_mode + neutral
-- surface tokens) so presets are genuine "vibes" (palette + font + mode +
-- surface), not just a palette/font pair. Existing rows backfilled with safe
-- defaults; Tiffin/Salon/Physio (the 3 focus personas) get curated presets
-- using the locked Fraunces+Inter / cool-ivory language.

ALTER TABLE layout_presets
  ADD COLUMN IF NOT EXISTS design_mode  text NOT NULL DEFAULT 'craft',
  ADD COLUMN IF NOT EXISTS page_bg      text NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS surface      text NOT NULL DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS border_color text NOT NULL DEFAULT '#E5E5E5';

-- Backfill existing rows: derive design_mode from the persona's current
-- DESIGN_MODE_MAP (inngest/build-page.ts) so pre-existing presets keep their
-- current visual family instead of silently flattening to 'craft'.
UPDATE layout_presets SET design_mode = 'editorial'
  WHERE persona IN ('photographer', 'doctor', 'musician', 'tutor');
-- (all other existing personas — trainer, baker, salon, chef, other — already
-- default correctly to 'craft', matching DESIGN_MODE_MAP)

-- Remove the old 4 generic salon presets — replaced below with curated ones.
DELETE FROM layout_presets WHERE persona = 'salon';

-- Tiffin — cool-ivory, craft mode, Fraunces headings + Inter body
INSERT INTO layout_presets
  (persona, name, description, template, palette, font, design_mode, page_bg, surface, border_color, sort_order) VALUES
('tiffin', 'Home Kitchen',   'Warm and trustworthy — daily thali service', 'storefront', 'professional', 'inter', 'craft', '#FAFAF9', '#FFFFFF', '#ECECEA', 0),
('tiffin', 'Fresh Table',    'Bright, fresh-ingredients feel',             'storefront', 'fresh',        'inter', 'craft', '#FAFAF9', '#FFFFFF', '#ECECEA', 1),
('tiffin', 'Golden Thali',   'Rich, festive, celebration-ready',           'storefront', 'warm',         'inter', 'craft', '#FAFAF9', '#FFFFFF', '#ECECEA', 2);

-- Salon / Makeup — cool-ivory, craft mode, boutique feel
INSERT INTO layout_presets
  (persona, name, description, template, palette, font, design_mode, page_bg, surface, border_color, sort_order) VALUES
('salon', 'Atelier',  'Elegant and premium — editorial boutique feel', 'storefront', 'minimal',  'inter', 'craft', '#FAFAF9', '#FFFFFF', '#ECECEA', 0),
('salon', 'Blush',    'Warm and inviting — personal, glow-forward',    'storefront', 'warm',     'inter', 'craft', '#FAFAF9', '#FFFFFF', '#ECECEA', 1),
('salon', 'Noir',     'Bold and dramatic — high-fashion minimal',      'storefront', 'minimal',  'inter', 'editorial', '#FAFAF9', '#FFFFFF', '#ECECEA', 2);

-- Physio / Clinical — cool-ivory, editorial mode, calm-clinical feel
INSERT INTO layout_presets
  (persona, name, description, template, palette, font, design_mode, page_bg, surface, border_color, sort_order) VALUES
('physio', 'Clinic',  'Professional and precise — clinical trust',   'clinic', 'calm',         'inter', 'editorial', '#FAFAF9', '#FFFFFF', '#ECECEA', 0),
('physio', 'Recover', 'Calming, human, recovery-focused warmth',     'clinic', 'fresh',        'inter', 'editorial', '#FAFAF9', '#FFFFFF', '#ECECEA', 1);
