-- Phase 1 deep tutor capabilities: student learning records.
--
-- 1. Extend students with parent contact info (nullable, backward-compatible).
-- 2. New student_sessions table — one row per lesson/session logged.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS parent_name  text,
  ADD COLUMN IF NOT EXISTS parent_email text,
  ADD COLUMN IF NOT EXISTS parent_phone text;

CREATE TABLE IF NOT EXISTS student_sessions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid        NOT NULL REFERENCES providers(id)  ON DELETE CASCADE,
  student_id   uuid        NOT NULL REFERENCES students(id)   ON DELETE CASCADE,
  session_date date        NOT NULL DEFAULT CURRENT_DATE,
  topic        text,                        -- what was taught
  homework     text,                        -- homework assigned
  notes        text,                        -- private tutor notes
  attended     boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup: all sessions for a student sorted by date (timeline display)
CREATE INDEX IF NOT EXISTS idx_student_sessions_student  ON student_sessions(student_id, session_date DESC);
-- Fast lookup: all sessions for a provider (for progress reports / crons)
CREATE INDEX IF NOT EXISTS idx_student_sessions_provider ON student_sessions(provider_id);
