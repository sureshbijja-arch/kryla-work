-- Backfills the migration file for `wa_auth_otps`, which was created directly
-- against Supabase (see commit f6a5e00, "chore(pwa): create wa_auth_otps
-- table") without ever landing a tracked migration — there was a gap in
-- supabase/migrations/ where Supabase's own ledger recorded version
-- 20260716032704 "create_wa_auth_otps" with no corresponding file on disk.
-- Reconstructed from the live production schema; every statement is
-- idempotent so this is safe to run against an environment where the table
-- already exists (prod) or one where it doesn't (fresh/local).
--
-- Backs app/api/auth/whatsapp/start/route.ts and .../verify/route.ts — the
-- WhatsApp OTP login flow. code_hash is an HMAC-SHA256 of the 6-digit code,
-- keyed by OTP_SECRET (see .env.local.example) — the raw code is never
-- stored.

CREATE TABLE IF NOT EXISTS wa_auth_otps (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    integer not null default 0,
  consumed    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Covers the hot lookup in both routes:
--   WHERE phone = ? AND consumed = false AND expires_at > now()
--   ORDER BY created_at DESC LIMIT 1
CREATE INDEX IF NOT EXISTS wa_auth_otps_phone_idx
  ON wa_auth_otps (phone, consumed, expires_at DESC);

-- Service-role-only: no policies, so anon/authenticated roles are blocked by
-- RLS entirely. All access to this table is via supabaseAdmin.
ALTER TABLE wa_auth_otps ENABLE ROW LEVEL SECURITY;
