-- providers.created_at had no index, but /admin/members sorts by it by
-- default (newest first) — confirmed via a direct pg_indexes check during
-- the scale-readiness pass. Without this, that ORDER BY is an unindexed sort
-- that gets worse as the member count grows.

CREATE INDEX IF NOT EXISTS providers_created_at_idx ON providers(created_at DESC);
