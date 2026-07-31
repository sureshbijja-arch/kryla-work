-- supabase/migrations/20260731101500_ganesh_facts_section_registry.sql
--
-- Adds the new 'facts' section (Material/Sizes/Colours/Delivery strip) to
-- the two places a section needs registering beyond PERSONA_SECTIONS
-- (inngest/build-page.ts, code-only): the layout_presets "Shadu" row (so a
-- member who applies this preset from MyKryla -> Layouts gets the fact strip
-- too, not just new signups) and section_types (admin-only /admin/layouts
-- registry — informational only, does not gate rendering; see precedent
-- comment in 20260731093000_register_missing_variants.sql).

UPDATE layout_presets SET sections = '[
  {"sectionKey": "hero",       "variant": "shadu",      "order": 1},
  {"sectionKey": "facts",      "variant": "strip",      "order": 2},
  {"sectionKey": "services",   "variant": "sizes",      "order": 3},
  {"sectionKey": "gallery",    "variant": "grid",       "order": 4},
  {"sectionKey": "bio",        "variant": "callout",    "order": 5},
  {"sectionKey": "highlights", "variant": "icons",      "order": 6},
  {"sectionKey": "faq",        "variant": "accordion",  "order": 7},
  {"sectionKey": "contact",    "variant": "enquiry",    "order": 8}
]'::jsonb
WHERE persona = 'sellganeshidols' AND name = 'Shadu';

-- variants shape here is a flat string array, matching the most recent
-- precedent (20260731093000_register_missing_variants.sql's hero/services
-- updates) rather than the original {key,label} object-array seed
-- (20260629000005_section_engine.sql) — pre-existing shape drift in this
-- table this migration doesn't attempt to resolve, only match. label is
-- NOT NULL on this table.
INSERT INTO section_types (key, label, variants, sort_order)
VALUES ('facts', 'Facts Strip', '["strip"]'::jsonb, 7)
ON CONFLICT (key) DO UPDATE SET variants = EXCLUDED.variants;
