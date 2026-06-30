-- Profile media: avatar, gallery, ads

ALTER TABLE providers ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE pages     ADD COLUMN IF NOT EXISTS gallery   jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS ads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  image_url   text,
  link_url    text,
  status      text        NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ads_provider_status ON ads (provider_id, status);
