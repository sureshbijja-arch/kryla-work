-- supabase/migrations/20260719000001_booking_duration.sql
-- Adds duration-aware scheduling to bookings (salon/makeup vertical build) and a
-- no_show status. start_at is NULL on existing rows and new free-text-slot requests
-- until parsed (Task 2) or set explicitly by the owner on accept (Task 3) — the
-- day-view simply won't show those until then.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_min int,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent_at timestamptz;

-- end_at is derived, not stored redundantly by hand — generated column keeps it
-- always consistent with start_at + duration_min. Plain `start_at + interval` on a
-- timestamptz is only STABLE (not IMMUTABLE, since day/month intervals aren't
-- timezone-independent) and Postgres rejects that in a generated column. Pinning the
-- arithmetic to a fixed zone (UTC) makes it deterministic and therefore IMMUTABLE.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS end_at timestamptz
  GENERATED ALWAYS AS (
    ((start_at AT TIME ZONE 'UTC') + (duration_min * interval '1 minute')) AT TIME ZONE 'UTC'
  ) STORED;

-- Extend status check to include no_show (Step 2 of the build spine).
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending','accepted','rejected','cancelled','onhold','no_show'));

-- Drop NOT NULL on legacy columns — CLAUDE.md: "unused, do not write to them."
-- Columns are kept (existing rows still have data) but no longer required for new inserts.
ALTER TABLE bookings ALTER COLUMN client_name DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN client_phone DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN service_requested DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN requested_slot DROP NOT NULL;

-- Index for the day-view query (provider's bookings for a date range, ordered by time).
CREATE INDEX IF NOT EXISTS idx_bookings_provider_start
  ON bookings (provider_id, start_at)
  WHERE start_at IS NOT NULL;

-- Index for the reminder cron's window scan.
CREATE INDEX IF NOT EXISTS idx_bookings_start_status
  ON bookings (start_at, status)
  WHERE status = 'accepted';

-- Task 5/7's reminder cron and webhook logging both write notifications.booking_id,
-- which doesn't exist yet (pre-flight scan found this — notifications only has
-- provider_id/student_id today). Add it here since Task 1 already owns schema changes.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id);
