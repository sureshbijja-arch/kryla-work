-- supabase/migrations/20260801090000_ganesh_v3_theme.sql
--
-- Member feedback: the shipped sellganeshidols page (commits 6169722,
-- b0d0746) still reads as AI-generated. Root cause found on inspection —
-- designscreenshots/sellganeshidolsv3.pdf (a newer, approved reference) is a
-- structurally different page: a two-column product-detail layout on a warm
-- cream ground with real commerce machinery (size selector with three price
-- tiers, an INCLUDES checklist, dual CTA, tabbed story section, 4-up
-- collection grid) — not the flat full-bleed terracotta hero + vertical
-- bordered-row stack that shipped. This migration ships the new color
-- identity; component changes ship alongside it in the same commit.
--
-- Colors sampled directly from the PDF (pdfjs-dist render + canvas pixel
-- probe, not eyeballed): ground #FAF6EF, image/card fill #E5DDCC, ink
-- #2A2320, muted ink #6B5D4E, russet #7A3B12, festive chip #F0E4CE, hairline
-- #E8DFCF. This replaces the prior fired-terracotta #8A4322 identity
-- (20260731090000_ganesh_theme_font_columns.sql) — that identity matched an
-- earlier, since-superseded mockup.
--
-- Contrast verified (WCAG 2.1 relative-luminance formula, computed not
-- eyeballed) against the new backgrounds, same discipline as the terracotta
-- migration:
--   #7A3B12 (russet-as-text) on #FAF6EF (page bg)     -> 7.92:1  (needs >=4.5:1)
--   #6B5D4E (muted ink) on #FAF6EF                    -> 5.91:1  (needs >=4.5:1)
--   #FFFFFF (button text) on #2A2320 (primary CTA bg) -> 15.44:1 (needs >=4.5:1)
--   #FFFFFF (button text) on #7A3B12 (accent bg)      -> 8.53:1  (needs >=3:1, large/UI)
-- All four clear their thresholds with margin — the prior critique's
-- ink-faint failure (#8A8477 on #F6F5F2, ~2.9:1) is specifically avoided by
-- using #6B5D4E rather than a lighter faint tone for muted body copy.
--
-- accentSurface/accentBorder are NOT the generic ${accent}0d/${accent}26
-- alpha-suffix math LayoutRenderer falls back to for personas without a
-- curated token set — that math produces a cold, faintly grey wash when the
-- base hue is warm/dark like #7A3B12. Values below are picked to read as
-- "cream, slightly deeper" instead, matching the PDF's own card/chip fills
-- (#E5DDCC image-placeholder fill, #F0E4CE festive-price chip).
--
-- palette_tokens gains two NEW optional fields this migration: ink/inkMuted
-- (see PaletteTokens in lib/layouts.ts). Per this project's no-hardcoding
-- rule, HeroPdp/Collection/Story read these via LayoutRenderer's new
-- --color-ink/--color-ink-muted custom properties rather than literal hex —
-- the platform's generic --kryla-dark/--kryla-muted (#0D0D0D/#6b6259) are
-- calibrated against white/near-white and read as slightly cold/desaturated
-- on this persona's warm cream ground, so this persona gets a curated pair,
-- same mechanism as accent/signature. Every other persona's palette_tokens
-- lacks these keys, so LayoutRenderer's fallback (generic --kryla-dark/
-- --kryla-muted) applies unchanged — additive, not a behavior change.
--
-- display_font/body_font/radius_card/radius_btn are UNCHANGED from the prior
-- migration (Newsreader + Inter, 2px) — the PDF's fonts read as Segoe/Arial
-- only because it's a browser print-to-PDF without webfonts loaded; the
-- approved Direction Contract's serif/sans pairing and sharp-corner radius
-- are not part of what's being corrected here.
--
-- Same nullable-additive, single-persona-scoped mechanism as every prior
-- Ganesh migration: every other persona's palette_tokens/page_bg/etc. is
-- untouched, and re-running this migration is safe (plain UPDATE ... WHERE).
--
-- personas.page_bg/surface/border_color are NEW columns — the prior Ganesh
-- migrations never needed them because PAGE_BG['warm'] (#FFF7ED, the flat
-- ACCENT-enum fallback) was close enough to terracotta's warm family. The
-- cream #FAF6EF ground is specific enough that it needs a curated value like
-- palette_tokens/signature_color, so it gets the same per-persona-defaults
-- treatment: personas column -> fetchPersonaDefaults() -> build-page.ts
-- write-pages-row -> pages column (see lib/personas.ts and
-- inngest/build-page.ts changes in this same commit). Additive: every other
-- persona's row gets NULL here, and NULL already means "no override" to
-- fetchPersonaDefaults()/LayoutRenderer.

ALTER TABLE personas ADD COLUMN IF NOT EXISTS page_bg      text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS surface      text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS border_color text;

UPDATE personas SET
  palette_tokens = '{
    "accent": "#7A3B12", "accentSurface": "#F0E4CE", "accentBorder": "#E8DFCF",
    "accentGlow": "#7A3B1240", "signature": "#7A3B12",
    "ink": "#2A2320", "inkMuted": "#6B5D4E"
  }'::jsonb,
  signature_color = '#7A3B12',
  page_bg     = '#FAF6EF',
  surface     = '#FFFFFF',
  border_color = '#E8DFCF'
WHERE id = 'sellganeshidols';

-- Existing sellganeshidols members' pages rows: bring the color identity in
-- line with the corrected reference. Conservative like every prior Ganesh
-- backfill — only this persona's rows, only the columns this migration
-- touches, and only where the row still holds the terracotta identity
-- (a member who has since hand-picked their own accent/page_bg is left
-- alone).
UPDATE pages SET
  palette_tokens = '{
    "accent": "#7A3B12", "accentSurface": "#F0E4CE", "accentBorder": "#E8DFCF",
    "accentGlow": "#7A3B1240", "signature": "#7A3B12",
    "ink": "#2A2320", "inkMuted": "#6B5D4E"
  }'::jsonb,
  signature_color = '#7A3B12',
  page_bg      = '#FAF6EF',
  surface      = '#FFFFFF',
  border_color = '#E8DFCF'
WHERE provider_id IN (SELECT id FROM providers WHERE persona = 'sellganeshidols')
  AND (signature_color IS NULL OR signature_color = '#8A4322');

-- New content columns this rebuild introduces — same additive pattern as
-- facts/footer_note (20260731100000_ganesh_mockup_fidelity.sql): jsonb,
-- reusable by any future persona, no ganesh-specific column names.
--   includes   — PDP "Includes" checklist (hero pdp variant), string array.
--   story_tabs — tabbed story content (bio `story` variant), {label,body}[].
ALTER TABLE pages ADD COLUMN IF NOT EXISTS includes    jsonb DEFAULT '[]'::jsonb;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS story_tabs  jsonb DEFAULT '[]'::jsonb;

UPDATE pages SET includes = '[
  "Hand-finished natural stone base",
  "Certificate of authenticity & artisan signature",
  "Padded crate shipping, insured"
]'::jsonb
WHERE provider_id IN (SELECT id FROM providers WHERE persona = 'sellganeshidols')
  AND (includes IS NULL OR includes = '[]'::jsonb);

UPDATE pages SET story_tabs = '[
  {"label": "Story & Craft", "body": "Every idol begins as an uncut block of natural shadu clay — nothing is cast or moulded. Each piece is hand-shaped and finished by hand, following techniques passed down through generations of artisans."},
  {"label": "Materials & Care", "body": "Natural shadu clay, water-soluble colours only. Dissolves cleanly for eco-friendly visarjan. Keep away from direct sun and moisture before use to preserve the finish."},
  {"label": "Shipping & Returns", "body": "Advance orders recommended, especially before Ganesh Chaturthi. Doorstep delivery. Reply on WhatsApp for the fastest response on order status or changes."}
]'::jsonb
WHERE provider_id IN (SELECT id FROM providers WHERE persona = 'sellganeshidols')
  AND (story_tabs IS NULL OR story_tabs = '[]'::jsonb);

-- ── Section list — hero/services/bio variants change (pdp/collection/story
-- replace shadu/sizes/callout); gallery and highlights drop out of the
-- default list (the hero now consumes photography directly, and highlights
-- was rendering nothing for every seeded member: highlights: []). Both
-- sections remain in the registry for any member who adds content.
--
-- Three places must stay in sync, same as every prior Ganesh section-list
-- change: PERSONA_SECTIONS (inngest/build-page.ts, code-only, no migration
-- needed), this layout_presets row, and scripts/seed-e2e-provider.mjs.

UPDATE layout_presets SET
  page_bg = '#FAF6EF', surface = '#FFFFFF', border_color = '#E8DFCF',
  palette_tokens = '{
    "accent": "#7A3B12", "accentSurface": "#F0E4CE", "accentBorder": "#E8DFCF",
    "accentGlow": "#7A3B1240", "signature": "#7A3B12",
    "ink": "#2A2320", "inkMuted": "#6B5D4E"
  }'::jsonb,
  sections = '[
    {"sectionKey": "hero",     "variant": "pdp",        "order": 1},
    {"sectionKey": "facts",    "variant": "strip",      "order": 2},
    {"sectionKey": "services", "variant": "collection", "order": 3},
    {"sectionKey": "bio",      "variant": "story",      "order": 4},
    {"sectionKey": "faq",      "variant": "accordion",  "order": 5},
    {"sectionKey": "contact",  "variant": "enquiry",    "order": 6}
  ]'::jsonb
WHERE persona = 'sellganeshidols' AND name = 'Shadu';

UPDATE pages SET sections = '[
  {"sectionKey": "hero",     "variant": "pdp",        "order": 1},
  {"sectionKey": "facts",    "variant": "strip",      "order": 2},
  {"sectionKey": "services", "variant": "collection", "order": 3},
  {"sectionKey": "bio",      "variant": "story",      "order": 4},
  {"sectionKey": "faq",      "variant": "accordion",  "order": 5},
  {"sectionKey": "contact",  "variant": "enquiry",    "order": 6}
]'::jsonb
WHERE provider_id IN (SELECT id FROM providers WHERE persona = 'sellganeshidols')
  AND sections @> '[{"sectionKey": "hero", "variant": "shadu"}]'::jsonb;

-- section_types registry entries (admin-only /admin/layouts registry —
-- informational only, does not gate rendering; see precedent comment in
-- 20260731093000_register_missing_variants.sql). Full-array replace, matching
-- the established convention in that migration and 20260630000001 rather than
-- a jsonb `||` append — also drops 'shadu'/'sizes', which this rebuild
-- retires (the components themselves are deleted in the same commit).
UPDATE section_types SET variants = '["minimal","split","banner","centered","dark","gradient","photo","sweep","dabba","pdp"]' WHERE key = 'hero';
UPDATE section_types SET variants = '["list","grid","menu","pricing","features","price-list","collection"]' WHERE key = 'services';
UPDATE section_types SET variants = '["paragraph","accent","callout","dark","story"]' WHERE key = 'bio';
