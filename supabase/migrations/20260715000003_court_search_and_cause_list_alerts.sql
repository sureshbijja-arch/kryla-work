-- ============================================================
-- Advocate Court Tools — Name search portals + cause-list alerts
-- ============================================================
-- 1. providers: add per-advocate cause-list-alert opt-in columns
-- 2. system_config.court_tools: add name-search portal keys
-- 3. system_config.notification_types_enabled: add cause_list_digest toggle
-- ============================================================

-- ── Per-advocate opt-in ────────────────────────────────────────────────────────

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS cause_list_alerts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cause_list_alert_sent_for date;

-- ── Name-search portal keys (extends existing court_tools portals jsonb) ────────

UPDATE system_config
SET value = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        value,
        '{portals,party_search}',
        '"https://services.ecourts.gov.in/ecourtindia_v6/?p=casestatus/index"'::jsonb
      ),
      '{portals,advocate_search}',
      '"https://services.ecourts.gov.in/ecourtindia_v6/?p=casestatus/index"'::jsonb
    ),
    '{portals,hc_services}',
    '"https://hcservices.ecourts.gov.in/ecourtindia_v6/"'::jsonb
  ),
  '{portals,sci_status}',
  '"https://main.sci.gov.in/case-status"'::jsonb
),
updated_at = now()
WHERE key = 'court_tools';

-- ── Global kill-switch for cause-list digest ───────────────────────────────────

-- notification_types_enabled may not exist yet — use upsert
INSERT INTO system_config (key, value)
VALUES (
  'notification_types_enabled',
  jsonb_build_object(
    'hearing_reminders',  true,
    'cause_list_digest',  true
  )
)
ON CONFLICT (key) DO UPDATE
SET value = system_config.value || jsonb_build_object('cause_list_digest', true),
    updated_at = now();
