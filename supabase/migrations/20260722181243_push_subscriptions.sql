-- push_subscriptions — Web Push subscriptions for the MyKryla PWA.
-- One provider can have several (phone + laptop, or after reinstalling).
-- `endpoint` is unique per browser/device push registration, so it's the
-- natural upsert key on (re-)subscribe.
--
-- Service-role-only: written by app/api/push/subscribe/route.ts (auth-gated
-- by provider email ownership, mirrors app/api/mychat/whatsapp-connect/route.ts)
-- and read by lib/push/send.ts. No client-side reads exist, so RLS is enabled
-- with no policies — consistent with studio/clinical tables in this project.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_provider_idx ON push_subscriptions(provider_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
