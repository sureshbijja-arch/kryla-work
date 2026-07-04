-- Phase A: Availability + slot-based bookings

-- Availability table: member-managed open dates + timeslots
create table if not exists availability (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  day_key     text not null,          -- ISO date string: '2026-07-15'
  active      boolean not null default true,
  slots       jsonb not null default '[]', -- ["9:00 AM","10:00 AM"]
  updated_at  timestamptz not null default now(),
  unique (provider_id, day_key)
);

create index if not exists idx_availability_provider on availability(provider_id);
create index if not exists idx_availability_day on availability(provider_id, day_key);

create or replace trigger trg_availability_updated_at
  before update on availability
  for each row execute function update_updated_at();

-- Add preferred_slot column to bookings
alter table bookings add column if not exists preferred_slot text;

-- Extend status CHECK to include 'onhold'
do $$ begin
  begin
    alter table bookings drop constraint bookings_status_check;
  exception when undefined_object then null;
  end;
end $$;

alter table bookings add constraint bookings_status_check
  check (status in ('pending','accepted','rejected','cancelled','onhold'));
