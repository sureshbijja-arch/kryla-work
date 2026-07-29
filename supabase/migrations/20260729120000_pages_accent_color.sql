-- Mirrors page_bg/surface/border_color's addition to `pages`
-- (see 20260728151500_pages_theme_columns.sql). Nullable, no default —
-- NULL means "inherit accent from the applied preset/palette", exactly
-- as the existing 3 color columns already behave.
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS accent_color text;
