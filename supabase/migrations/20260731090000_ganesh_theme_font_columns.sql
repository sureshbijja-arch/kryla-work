-- supabase/migrations/20260731090000_ganesh_theme_font_columns.sql
--
-- inngest/build-page.ts never writes palette_tokens/signature_color/fonts onto a
-- NEW page at all — only a member manually applying a layout_presets row does
-- that (see 20260729160000_palette_tokens_columns.sql), and even that only
-- reaches pages.draft_data until published. So a brand-new sellganeshidols
-- signup renders palette:'warm' -> ACCENT.warm '#EA8C00' (orange), never the
-- fired-terracotta redesign, no matter how correct the section components are.
--
-- Fix: add the same per-persona defaults mechanism already used for
-- template/palette/font/default_gallery (fetchPersonaDefaults() in
-- lib/personas.ts) so build-page.ts can write a real color+font identity onto
-- every new page automatically. All other 45 personas get NULL in every new
-- column here -> zero behavior change for them.
--
-- Terracotta #8A4322 chosen and contrast-verified against all four real
-- constraints before being written (WCAG 2.1 relative-luminance formula):
--   accent-as-text on PAGE_BG.warm  #FFF7ED  -> 6.80:1  (needs >=4.5:1)
--   accent-as-text on kryla-bg      #FAFAF9  -> 6.92:1  (needs >=4.5:1)
--   white CTA text on accent bg              -> 7.22:1  (needs >=3:1)
--   white h1 on the flat hero field          -> 7.22:1  (needs >=3:1, large text)
--   white/88% subheadline on the hero field  -> 5.99:1  (needs >=4.5:1, body text)
-- All five pass comfortably, so accent and signature use the same hex — no
-- need to split them the way the two-token system otherwise allows.
--
-- display_font/body_font store full CSS font-family stacks (not bare family
-- names) so LayoutRenderer can apply them as a plain inline style with no
-- persona-literal branching in component code, per this project's
-- no-hardcoded-configurable-data convention. Bricolage Grotesque + Public Sans
-- are NOT added to the member-selectable FontKey/FONT_CLASS enum (that would
-- make them choosable by all 46 personas) — this is a DB-driven override
-- reaching only sellganeshidols.

ALTER TABLE personas ADD COLUMN IF NOT EXISTS palette_tokens  jsonb;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS signature_color text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS display_font    text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS body_font       text;

ALTER TABLE pages ADD COLUMN IF NOT EXISTS display_font text;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS body_font    text;

UPDATE personas SET
  palette_tokens = '{
    "accent": "#8A4322", "accentSurface": "#8A43220d", "accentBorder": "#8A432226",
    "accentGlow": "#8A432240", "signature": "#8A4322"
  }'::jsonb,
  signature_color = '#8A4322',
  display_font = 'var(--font-bricolage), "Bricolage Grotesque", system-ui, sans-serif',
  body_font    = 'var(--font-public-sans), "Public Sans", system-ui, sans-serif',
  -- All 4 seeded gallery images are confirmed stock-marketing composites with
  -- baked-in placeholder copy (fake grass background, "ECO FRIENDLY" seals,
  -- unreplaced "Price Details ...." cards) — not usable photography. The new
  -- hero is a flat field that doesn't consume gallery images the way the
  -- 'photo' variant did, so these are simply cleared rather than replaced.
  -- The gallery SECTION stays in PERSONA_SECTIONS (see the build-page.ts
  -- change) so a member's first real uploaded photo still appears there.
  default_gallery = '[]'::jsonb
WHERE id = 'sellganeshidols';

-- Existing sellganeshidols members' pages.gallery may still hold the 4 bad
-- seeded URLs (the festival pilot has real members — see project memory).
-- This does NOT touch every ganesh page; it only clears the gallery where it
-- still matches the exact bad seed, byte for byte, so a member who has since
-- uploaded or curated their own gallery is left untouched. This is
-- deliberately conservative: it is safe to run whether or not any member has
-- customized their gallery, and safe to run more than once.
UPDATE pages SET gallery = '[]'::jsonb
WHERE provider_id IN (SELECT id FROM providers WHERE persona = 'sellganeshidols')
  AND gallery = '["/images/Ganesh1.jpg", "/images/Ganesh2.jpg", "/images/Ganesh3.jpg", "/images/GaneshClay.jpg"]'::jsonb;
