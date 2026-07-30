-- supabase/migrations/20260729160000_palette_tokens_columns.sql
--
-- Adds real multi-color identity for curated layout_presets, replacing the
-- flat 6-value ACCENT enum every preset currently shares. palette_tokens
-- carries accent + pre-computed tints + one signature color; pages gets the
-- same column (member's resolved copy, written at apply-time) plus a
-- standalone signature_color override column mirroring the existing
-- accent_color/page_bg/surface/border_color override pattern.

ALTER TABLE layout_presets ADD COLUMN IF NOT EXISTS palette_tokens jsonb;
ALTER TABLE pages          ADD COLUMN IF NOT EXISTS palette_tokens jsonb;
ALTER TABLE pages          ADD COLUMN IF NOT EXISTS signature_color text;
