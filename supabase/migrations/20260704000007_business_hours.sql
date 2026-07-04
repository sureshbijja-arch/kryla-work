-- business_hours: weekly recurring schedule stored per provider
-- Shape: { timezone: string, mon/tue/.../sun: { open: "HH:MM", close: "HH:MM" } | null }
alter table providers add column if not exists business_hours jsonb;
