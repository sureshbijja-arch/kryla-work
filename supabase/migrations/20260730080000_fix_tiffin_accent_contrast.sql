-- supabase/migrations/20260730080000_fix_tiffin_accent_contrast.sql
--
-- Task 11 (verification) found Home Kitchen's turmeric accent #D68A2E
-- (seeded by 20260729161500_focus_persona_palette_tokens_seed.sql) fails WCAG AA
-- in both real usages: 2.67:1 as text on the actual page_bg #FAFAF9 (needs 4.5:1),
-- and 2.79:1 as white-on-accent for a CTA button (needs 3:1). Replaced with a
-- darker, same-hue-family burnt ochre #9C5810 — 5.27:1 on #FAFAF9, 5.50:1 for
-- white-on-accent, both comfortably passing. Signature (#B5472F) is unaffected.

UPDATE layout_presets SET palette_tokens = '{
  "accent": "#9C5810", "accentSurface": "#9C58100d", "accentBorder": "#9C581026",
  "accentGlow": "#9C581040", "signature": "#B5472F"
}'::jsonb
WHERE persona = 'tiffin' AND name = 'Home Kitchen';
