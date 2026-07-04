-- Phase D: Analytics + likes

create table if not exists page_events (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  event_type  text not null check (event_type in ('page_view','booking_click','whatsapp_click','like')),
  referrer    text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_page_events_provider on page_events(provider_id);
create index if not exists idx_page_events_type     on page_events(event_type);

create table if not exists page_reactions (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  likes       int not null default 0,
  unique (provider_id)
);

create index if not exists idx_page_reactions_provider on page_reactions(provider_id);
