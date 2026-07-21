-- Per-member cosmetic/content override layer. Scope is deliberately narrow:
-- styling and minor content exceptions only — NOT a general escape hatch for
-- new business logic or integrations (those become persona-level features,
-- reviewed and shared, per the standing no-hardcoding rule). Admin-set only
-- at first (via /admin/members or a follow-up detail view), not member
-- self-serve, so real usage patterns can be observed before wider exposure.
--
-- Read as an optional overlay on top of normal pages columns — same
-- read-merge pattern draft_data already establishes. Empty object ({}) means
-- no override; every existing page is unaffected by this column's addition.
--
-- Note: custom_css appears in db/supabase_schema.sql (a base-schema reference
-- file) but was confirmed absent from the live prod table — that file does
-- not reflect what's actually deployed. Both columns are created fresh here.

ALTER TABLE pages ADD COLUMN IF NOT EXISTS content_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Scoped per-member CSS, injected only into that member's public page (see
-- app/[slug]/page.tsx). Admin-set only, same reasoning as content_overrides.
ALTER TABLE pages ADD COLUMN IF NOT EXISTS custom_css text;
