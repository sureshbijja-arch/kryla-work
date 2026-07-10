-- DPDP Act 2023: append-only consent audit table + student consent columns

CREATE TABLE IF NOT EXISTS consent_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  student_id  uuid        REFERENCES students(id) ON DELETE SET NULL,
  event       text        NOT NULL CHECK (event IN ('granted', 'withdrawn', 'updated', 'erased')),
  source      text        NOT NULL CHECK (source IN ('ai_intake', 'manual', 'client_withdrawal', 'erasure')),
  purpose     text,
  actor       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_events_provider ON consent_events (provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_events_student  ON consent_events (student_id)
  WHERE student_id IS NOT NULL;

ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_updated_at  timestamptz;
ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_purpose     text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS consent_token       uuid UNIQUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS pii_erased_at       timestamptz;
