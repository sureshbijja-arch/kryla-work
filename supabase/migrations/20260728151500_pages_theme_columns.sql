-- Mirrors design_mode's addition to `pages` (see 20260728150000_layout_presets_theme_columns.sql).
-- These are nullable — unlike layout_presets' NOT NULL defaults, a member who has never
-- applied a preset (or applied one before this migration) should fall back to the existing
-- PAGE_BG[palette] hardcoded map in app/[slug]/types.ts, not a forced default here.
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS page_bg      text,
  ADD COLUMN IF NOT EXISTS surface      text,
  ADD COLUMN IF NOT EXISTS border_color text;
