-- Reshape notification_types_enabled to use merged hearing_reminders key
-- and add client_intake key.
-- Old keys: hearing_reminder_7d, hearing_reminder_1d, consultation_followup
-- New keys: hearing_reminders, consultation_followup, client_intake
--
-- Preserve existing consultation_followup value; default the two new keys to true.

UPDATE system_config
SET
  value = jsonb_build_object(
    'hearing_reminders',   COALESCE(value->'hearing_reminder_7d', 'true'::jsonb),
    'consultation_followup', COALESCE(value->'consultation_followup', 'true'::jsonb),
    'client_intake',       'true'::jsonb
  ),
  updated_at = now()
WHERE key = 'notification_types_enabled';

-- In case the row doesn't exist yet (fresh install)
INSERT INTO system_config (key, value)
VALUES (
  'notification_types_enabled',
  '{"hearing_reminders": true, "consultation_followup": true, "client_intake": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
