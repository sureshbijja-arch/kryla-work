-- Design mode column: craft | editorial | product
-- Determines type scale, spacing density, and border radius per persona group
ALTER TABLE pages ADD COLUMN IF NOT EXISTS design_mode text NOT NULL DEFAULT 'craft';

-- Backfill existing rows based on template (best available signal before persona_map exists)
UPDATE pages SET design_mode = 'editorial' WHERE template IN ('portfolio', 'clinic');
UPDATE pages SET design_mode = 'craft'     WHERE template IN ('focus', 'storefront');
