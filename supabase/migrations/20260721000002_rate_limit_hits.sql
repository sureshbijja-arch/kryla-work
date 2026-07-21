-- Backing store for lib/rateLimit.ts. DB-backed (not in-memory) because Vercel
-- serverless instances don't share memory — an in-memory counter would reset
-- per cold start and give a false sense of protection. Mirrors the existing
-- DB-backed cooldown pattern in app/api/auth/whatsapp/start/route.ts.

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket     text NOT NULL,        -- identifies the endpoint/limiter, e.g. 'onboarding-submit'
  identifier text NOT NULL,        -- the caller, e.g. an IP address
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_hits_lookup_idx ON rate_limit_hits(bucket, identifier, created_at);

-- Old rows are harmless (never read past the window) but worth trimming
-- periodically; no automatic cleanup job exists yet — acceptable at current
-- volume, revisit if this table grows large.
