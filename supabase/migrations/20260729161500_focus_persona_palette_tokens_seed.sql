-- supabase/migrations/20260729161500_focus_persona_palette_tokens_seed.sql
--
-- Real per-persona color identity for the 3 focus-persona curated presets,
-- replacing their shared flat ACCENT-enum-derived look. Grounded per
-- docs/superpowers/specs/2026-07-29-focus-persona-signature-themes-design.md.

UPDATE layout_presets SET palette_tokens = '{
  "accent": "#7B4B3A", "accentSurface": "#7B4B3A0d", "accentBorder": "#7B4B3A26",
  "accentGlow": "#7B4B3A40", "signature": "#C9A56A"
}'::jsonb
WHERE persona = 'salon' AND name = 'Atelier';

UPDATE layout_presets SET palette_tokens = '{
  "accent": "#D68A2E", "accentSurface": "#D68A2E0d", "accentBorder": "#D68A2E26",
  "accentGlow": "#D68A2E40", "signature": "#B5472F"
}'::jsonb
WHERE persona = 'tiffin' AND name = 'Home Kitchen';

UPDATE layout_presets SET palette_tokens = '{
  "accent": "#2F6E64", "accentSurface": "#2F6E640d", "accentBorder": "#2F6E6426",
  "accentGlow": "#2F6E6440", "signature": "#8E6E5C"
}'::jsonb
WHERE persona = 'physio' AND name = 'Clinic';

-- Atelier (Salon): complete sections array (persona default with hero → 'sweep'
-- and services → 'price-list'). sections was null, so this sets the full
-- array rather than patching a nonexistent one.
UPDATE layout_presets SET sections = '[
  {"sectionKey": "hero",       "variant": "sweep",      "order": 1},
  {"sectionKey": "services",   "variant": "price-list", "order": 2},
  {"sectionKey": "gallery",    "variant": "scroll",     "order": 3},
  {"sectionKey": "highlights", "variant": "icons",      "order": 4},
  {"sectionKey": "bio",        "variant": "paragraph",  "order": 5},
  {"sectionKey": "faq",        "variant": "accordion",  "order": 6},
  {"sectionKey": "contact",    "variant": "both",       "order": 7}
]'::jsonb
WHERE persona = 'salon' AND name = 'Atelier';

-- Home Kitchen (Tiffin): complete sections array (persona default with hero →
-- 'dabba'; services stays 'pricing' — dabba treatment is hero-only this pass).
UPDATE layout_presets SET sections = '[
  {"sectionKey": "hero",       "variant": "dabba",      "order": 1},
  {"sectionKey": "services",   "variant": "pricing",    "order": 2},
  {"sectionKey": "gallery",    "variant": "grid",       "order": 3},
  {"sectionKey": "bio",        "variant": "callout",    "order": 4},
  {"sectionKey": "highlights", "variant": "icons",      "order": 5},
  {"sectionKey": "faq",        "variant": "accordion",  "order": 6},
  {"sectionKey": "contact",    "variant": "both",       "order": 7}
]'::jsonb
WHERE persona = 'tiffin' AND name = 'Home Kitchen';

-- Clinic (Physio): palette-only this pass. sections stays null (unchanged) —
-- no new hero/services variant exists for Physio yet.
