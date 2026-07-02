-- Suggestions table for member feature requests
CREATE SEQUENCE IF NOT EXISTS suggestions_seq START 1;

CREATE TABLE IF NOT EXISTS suggestions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id  text        UNIQUE NOT NULL DEFAULT ('SUG-' || LPAD(nextval('suggestions_seq')::text, 4, '0')),
  provider_id    uuid        REFERENCES providers(id) ON DELETE CASCADE,
  description    text        NOT NULL,
  created_at     timestamptz DEFAULT now(),
  auto_implement boolean     DEFAULT false,
  status         text        DEFAULT 'pending',
  comments       text,
  updated_at     timestamptz DEFAULT now()
);

-- Pending provider columns from previous sessions (safe to run even if already applied)
ALTER TABLE providers ADD COLUMN IF NOT EXISTS instagram_handle text;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS nextdoor_url     text;
ALTER TABLE pages     ADD COLUMN IF NOT EXISTS menu_files       jsonb DEFAULT '[]'::jsonb;
