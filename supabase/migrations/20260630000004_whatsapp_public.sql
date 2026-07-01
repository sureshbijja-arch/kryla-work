-- Add whatsapp_public flag to providers
-- Controls whether the member's WhatsApp number is shown on their public page
-- Defaults to true so existing members who provided a number keep their button visible

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS whatsapp_public boolean NOT NULL DEFAULT true;
