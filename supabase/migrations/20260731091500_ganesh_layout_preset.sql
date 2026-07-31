-- supabase/migrations/20260731091500_ganesh_layout_preset.sql
--
-- PERSONA_SECTIONS (inngest/build-page.ts) covers a brand-new signup — this
-- covers the other path: a member who opens MyKryla -> Layouts and picks a
-- preset. sellganeshidols has zero layout_presets rows today (confirmed by
-- grep across all migrations), so that screen is currently empty for this
-- persona, and there's no way to *return* to the intended look after
-- experimenting with something else. Follows the exact pattern of the
-- salon/tiffin/physio curated presets (20260728150000_layout_presets_theme_columns.sql,
-- 20260729161500_focus_persona_palette_tokens_seed.sql).
--
-- Colors match the personas-level terracotta seeded in
-- 20260731090000_ganesh_theme_font_columns.sql (already contrast-verified
-- there) so applying this preset and the persona's own build-time default
-- produce the same look.

INSERT INTO layout_presets
  (persona, name, description, template, palette, font, design_mode, page_bg, surface, border_color, sort_order) VALUES
('sellganeshidols', 'Shadu', 'Fired-terracotta field, size-led idol catalog', 'storefront', 'warm', 'inter', 'craft', '#FAFAF9', '#FFFFFF', '#ECECEA', 0);

UPDATE layout_presets SET palette_tokens = '{
  "accent": "#8A4322", "accentSurface": "#8A43220d", "accentBorder": "#8A432226",
  "accentGlow": "#8A432240", "signature": "#8A4322"
}'::jsonb
WHERE persona = 'sellganeshidols' AND name = 'Shadu';

UPDATE layout_presets SET sections = '[
  {"sectionKey": "hero",       "variant": "shadu",      "order": 1},
  {"sectionKey": "services",   "variant": "sizes",      "order": 2},
  {"sectionKey": "gallery",    "variant": "grid",       "order": 3},
  {"sectionKey": "bio",        "variant": "callout",    "order": 4},
  {"sectionKey": "highlights", "variant": "icons",      "order": 5},
  {"sectionKey": "faq",        "variant": "accordion",  "order": 6},
  {"sectionKey": "contact",    "variant": "enquiry",    "order": 7}
]'::jsonb
WHERE persona = 'sellganeshidols' AND name = 'Shadu';
