-- Migration: billing_audit_tables
-- Creates webhook_events (idempotency guard) and payment_events (immutable audit ledger).

-- Webhook idempotency guard: atomic INSERT; on PK conflict (23505) the event was
-- already processed — return 200 immediately without reprocessing.
CREATE TABLE IF NOT EXISTS webhook_events (
  gateway     text        NOT NULL CHECK (gateway IN ('stripe', 'razorpay')),
  event_id    text        NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gateway, event_id)
);

COMMENT ON TABLE webhook_events IS
  'One row per gateway webhook event. Used for at-most-once delivery. INSERT; on 23505 → already processed.';

-- Immutable audit ledger — one row per settled money movement or status change.
-- Never updated; only appended.
CREATE TABLE IF NOT EXISTS payment_events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  scope             text        NOT NULL CHECK (scope IN ('platform', 'member')),
  provider_id       uuid        NULL REFERENCES providers(id) ON DELETE SET NULL,
  payment_intent_id uuid        NULL,   -- FK to payment_intents added in migration 20260703000004
  gateway           text        NOT NULL CHECK (gateway IN ('stripe', 'razorpay')),
  event_type        text        NOT NULL,   -- e.g. 'platform.subscription.active'
  amount_minor      int         NULL,
  currency          char(3)     NULL,
  raw               jsonb       NOT NULL,   -- full gateway payload for audit / debugging
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_events_provider_idx
  ON payment_events(provider_id, created_at DESC);

COMMENT ON TABLE payment_events IS
  'Append-only audit ledger of payment and subscription lifecycle events from all gateways.';
COMMENT ON COLUMN payment_events.raw IS
  'Full raw gateway event payload — never mutated, used for debugging and reconciliation.';
