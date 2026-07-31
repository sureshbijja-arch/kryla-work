-- supabase/migrations/20260731100000_ganesh_mockup_fidelity.sql
--
-- A follow-up design audit compared the shipped sellganeshidols build against
-- the originally-approved mockup artifact and found real, undocumented
-- deviations: the mockup's Direction Contract specifies Newsreader (serif) +
-- Inter as the shared shell typography, but the prior migration
-- (20260731090000_ganesh_theme_font_columns.sql) shipped Bricolage
-- Grotesque + Public Sans instead, with no recorded rationale for the
-- substitution. The mockup also uses a sharp ~2px corner radius throughout
-- (buttons, cards) — a deliberate departure from this platform's shared
-- rounded/pill design tokens. User's explicit decision: match the mockup
-- exactly, no deviations. This migration corrects the font values (same
-- columns, new values) and adds the radius override columns (same
-- nullable-additive mechanism as display_font/body_font — all other 45
-- personas get NULL, zero behavior change for them).
--
-- radius_card/radius_btn store literal CSS length values (not bare numbers)
-- so LayoutRenderer can apply them as a plain inline custom-property, same
-- pattern as display_font/body_font — no persona-literal branching in
-- component code.

ALTER TABLE personas ADD COLUMN IF NOT EXISTS radius_card text;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS radius_btn  text;

ALTER TABLE pages ADD COLUMN IF NOT EXISTS radius_card text;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS radius_btn  text;

-- Mockup's "fact strip" (Material/Sizes/Colours/Delivery) and footer note
-- (kicker + sentence) are new content types with no existing schema home —
-- jsonb arrays/objects, same pattern as highlights/faq, reusable by any
-- future persona without ganesh-specific column names.
ALTER TABLE pages ADD COLUMN IF NOT EXISTS facts       jsonb DEFAULT '[]'::jsonb;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS footer_note jsonb;

UPDATE personas SET
  display_font = 'var(--font-newsreader), Newsreader, Georgia, serif',
  body_font    = 'var(--font-inter), Inter, system-ui, sans-serif',
  radius_card  = '2px',
  radius_btn   = '2px'
WHERE id = 'sellganeshidols';

-- Existing sellganeshidols members' pages rows (written before this
-- migration) still carry the old Bricolage/Public Sans stack, NULL radius,
-- and no facts/footer_note content — bring them in line with the corrected
-- persona defaults and the mockup's exact copy. This mirrors the
-- conservative backfill pattern from the prior migration: it only touches
-- rows for this persona, only the columns this migration introduces/
-- corrects, leaving all other member-authored content (services, bio, etc.)
-- untouched. facts/footer_note are only backfilled where still empty/null,
-- so a member who has since customized them is left alone.
UPDATE pages SET
  display_font = 'var(--font-newsreader), Newsreader, Georgia, serif',
  body_font    = 'var(--font-inter), Inter, system-ui, sans-serif',
  radius_card  = '2px',
  radius_btn   = '2px'
WHERE provider_id IN (SELECT id FROM providers WHERE persona = 'sellganeshidols');

UPDATE pages SET facts = '[
  {"label": "Material", "value": "Shadu clay"},
  {"label": "Sizes",    "value": "1 – 7 ft"},
  {"label": "Colours",  "value": "Natural · gold"},
  {"label": "Delivery", "value": "Doorstep"}
]'::jsonb
WHERE provider_id IN (SELECT id FROM providers WHERE persona = 'sellganeshidols')
  AND (facts IS NULL OR facts = '[]'::jsonb);

UPDATE pages SET footer_note = '{
  "kicker": "Advance orders recommended",
  "body": "Especially before Ganesh Chaturthi — reply on WhatsApp for fastest response."
}'::jsonb
WHERE provider_id IN (SELECT id FROM providers WHERE persona = 'sellganeshidols')
  AND footer_note IS NULL;
