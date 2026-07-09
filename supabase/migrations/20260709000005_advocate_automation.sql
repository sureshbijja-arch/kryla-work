-- Advocate workflow automation foundation
-- Phase 1 (hearing reminders) + Phase 4 (consultation follow-up) + shared infra

-- ── Extend students table ─────────────────────────────────────────────────────

-- Structured next hearing date (automation source; next_session free text stays for backward compat)
ALTER TABLE students ADD COLUMN IF NOT EXISTS next_hearing_date    date;
ALTER TABLE students ADD COLUMN IF NOT EXISTS next_hearing_note    text;

-- DPDP Act 2023 consent: must be true before any automated client WhatsApp is sent
ALTER TABLE students ADD COLUMN IF NOT EXISTS whatsapp_consent     boolean NOT NULL DEFAULT false;

-- Per-client toggle: advocate can enable/disable client reminders independently
ALTER TABLE students ADD COLUMN IF NOT EXISTS remind_client        boolean NOT NULL DEFAULT true;

-- Dedupe guards: store the hearing date each reminder was last sent for.
-- Prevents double-send if the cron runs multiple times on the same day.
ALTER TABLE students ADD COLUMN IF NOT EXISTS reminder_7d_sent_for date;
ALTER TABLE students ADD COLUMN IF NOT EXISTS reminder_1d_sent_for date;

-- Fast lookup for the daily cron: advocates' clients with upcoming hearings
CREATE INDEX IF NOT EXISTS idx_students_next_hearing_date
  ON students (provider_id, next_hearing_date)
  WHERE next_hearing_date IS NOT NULL;

-- ── Notification log ─────────────────────────────────────────────────────────
-- Append-only log of all outbound automated messages (WhatsApp reminders, follow-ups).
-- Used for delivery confirmation and audit; never mutated after insert.

CREATE TABLE IF NOT EXISTS notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  student_id   uuid        REFERENCES students(id) ON DELETE SET NULL,
  type         text        NOT NULL,     -- 'hearing_reminder_7d' | 'hearing_reminder_1d' | 'hearing_reminder_7d_client' | 'hearing_reminder_1d_client' | 'consultation_followup'
  channel      text        NOT NULL DEFAULT 'whatsapp',
  recipient    text,                     -- E.164 phone number or email address
  body         text,                     -- message body sent
  status       text        NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  sent_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_provider
  ON notifications (provider_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_student
  ON notifications (student_id)
  WHERE student_id IS NOT NULL;
