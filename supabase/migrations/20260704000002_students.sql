-- Phase B: Student/client roster

create table if not exists students (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references providers(id) on delete cascade,
  booking_id   uuid references bookings(id) on delete set null,
  name         text not null,
  label_1      text,           -- persona label: grade / fitness_level / etc.
  label_2      text,           -- persona label: subject / goal / etc.
  sessions     int not null default 0,
  next_session text,
  notes        text,
  avatar_color text not null default '#6366F1',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_students_provider on students(provider_id);
create index if not exists idx_students_booking  on students(booking_id);

create or replace trigger trg_students_updated_at
  before update on students
  for each row execute function update_updated_at();
