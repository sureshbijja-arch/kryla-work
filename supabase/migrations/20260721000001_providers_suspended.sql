-- Admin "Member Sites" kill-switch: a second, independent reason a site can be
-- taken down, distinct from page_live (which means "hasn't finished building").
-- A site resolves only when page_live = true AND suspended = false — see
-- middleware.ts findLiveSlug() and app/[slug]/page.tsx findProvider().
-- Defaults false for every existing row so shipping this changes nothing.

ALTER TABLE providers ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;
