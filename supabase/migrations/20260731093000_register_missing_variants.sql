-- supabase/migrations/20260731093000_register_missing_variants.sql
--
-- section_types is the admin-only /admin/layouts variant registry
-- (app/api/admin/layouts/sections/route.ts) — informational only, does not
-- gate rendering (a variant works whether or not it's listed here). sweep,
-- dabba and price-list shipped without ever being added (confirmed: absent
-- from every section_types migration since 20260630000001_section_variants.sql).
-- Adding those 3 alongside the 2 new ones this pass introduces (shadu, sizes)
-- closes that gap for the admin UI at the same time.

UPDATE section_types SET variants = '["minimal","split","banner","centered","dark","gradient","photo","sweep","dabba","shadu"]' WHERE key = 'hero';
UPDATE section_types SET variants = '["list","grid","menu","pricing","features","price-list","sizes"]' WHERE key = 'services';
