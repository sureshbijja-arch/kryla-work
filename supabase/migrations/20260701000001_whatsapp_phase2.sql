-- Phase 2: WhatsApp inbox tables

-- Stores each member's WhatsApp Business API connection credentials
-- One row per member (UNIQUE on provider_id)
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  provider_id         uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  phone_number_id     text NOT NULL,          -- Meta phone number ID (used for webhook routing)
  access_token        text NOT NULL,          -- Member's Meta access token
  display_phone_number text,                  -- Human-readable number e.g. "+91 98765 43210"
  connected_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id),
  UNIQUE (phone_number_id)
);

-- Stores all WhatsApp messages (inbound from customers + outbound replies from members)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  provider_id     uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  customer_phone  text NOT NULL,
  customer_name   text,
  body            text NOT NULL,
  direction       text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  wa_message_id   text,                       -- Meta's message ID (for deduplication)
  read            boolean NOT NULL DEFAULT false,
  msg_timestamp   timestamptz NOT NULL DEFAULT now()
);

-- Index for fast inbox queries per member, ordered by time
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_provider
  ON whatsapp_messages (provider_id, msg_timestamp DESC);

-- Index for webhook routing (phone_number_id → provider)
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_phone_number_id
  ON whatsapp_connections (phone_number_id);
