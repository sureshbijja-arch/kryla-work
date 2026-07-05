-- Stores a one-step undo snapshot for WhatsApp edits.
-- Shape: { pages: {field: previousValue}, providers: {field: previousValue}, at: ISO }
-- Cleared after UNDO is applied or after 10 minutes (checked in the webhook handler).
alter table providers add column if not exists wa_undo jsonb;
