-- system_config: global app-level configuration stored as key-value (jsonb value).
-- Avoids hardcoding toggles in source; any row can be updated from the admin UI.

CREATE TABLE IF NOT EXISTS system_config (
  key        text        PRIMARY KEY,
  value      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed: all automated notification types default to enabled.
INSERT INTO system_config (key, value)
VALUES (
  'notification_types_enabled',
  '{"hearing_reminder_7d": true, "hearing_reminder_1d": true, "consultation_followup": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
