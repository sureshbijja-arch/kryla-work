-- Provider email inbox tables
-- Each advocate gets a dedicated @kryla.work address; all inbound/outbound
-- email for that address is stored here and surfaced in the Email sub-tab
-- of MyChat (Messages → Email). Only advocates use this in v1.

-- ── 1. Address registry ──────────────────────────────────────────────────────
-- Reverse lookup for the inbound webhook (to → provider_id) and the
-- enable/disable switch for the email inbox.
CREATE TABLE IF NOT EXISTS provider_email (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  address     text NOT NULL,   -- e.g. "sharma-law@kryla.work"
  enabled     boolean NOT NULL DEFAULT true,
  UNIQUE (provider_id),
  UNIQUE (address)
);

-- Index for fast inbound webhook lookup (to → provider_id)
CREATE INDEX IF NOT EXISTS idx_provider_email_address
  ON provider_email (address);

-- ── 2. Email messages ────────────────────────────────────────────────────────
-- Mirrors whatsapp_messages; threaded by customer_email.
CREATE TABLE IF NOT EXISTS emails (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  provider_id    uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  customer_email text NOT NULL,
  customer_name  text,
  direction      text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject        text NOT NULL DEFAULT '',
  body_text      text NOT NULL DEFAULT '',
  body_html      text NOT NULL DEFAULT '',
  message_id     text NOT NULL,            -- RFC 2822 Message-ID (deduplication)
  in_reply_to    text,                     -- RFC 2822 In-Reply-To
  attachments    jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{name, size, url}]
  read           boolean NOT NULL DEFAULT false
);

-- Idempotency: ignore duplicate inbound webhooks
CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_message_id
  ON emails (message_id);

-- Inbox queries per provider, newest-first
CREATE INDEX IF NOT EXISTS idx_emails_provider_thread
  ON emails (provider_id, customer_email, created_at DESC);

-- ── 3. Row-Level Security ─────────────────────────────────────────────────────
ALTER TABLE provider_email ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Providers read/write their own rows only (mirrors whatsapp_messages policy)
CREATE POLICY "provider_email: owner access"
  ON provider_email FOR ALL
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "emails: owner access"
  ON emails FOR ALL
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Service role bypasses RLS (used by API routes and inbound webhook)
-- (service role is exempt from RLS by default in Supabase — no extra policy needed)
