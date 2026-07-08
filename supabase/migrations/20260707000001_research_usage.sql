-- research_usage: daily per-member rate limit counter for the research/web-search feature.
-- Each row = one provider + one calendar day (UTC). Upserted on every research call.
CREATE TABLE IF NOT EXISTS research_usage (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid       NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  day_key    text        NOT NULL, -- YYYY-MM-DD UTC
  count      int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, day_key)
);
