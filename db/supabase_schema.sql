-- Kryla.work — Supabase Schema
-- 7 tables per CLAUDE.md database spec
-- Run this in the Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- 1. providers — one row per Member
-- ─────────────────────────────────────────────
create table if not exists providers (
  id                   uuid primary key default uuid_generate_v4(),
  slug                 text not null unique,
  name                 text not null,
  email                text not null unique,
  phone                text,
  plan                 text not null default 'grow'
                         check (plan in ('grow','thrive','elevate')),
  plan_status          text not null default 'pending_payment'
                         check (plan_status in ('active','pending_payment','past_due','cancelled')),
  stripe_customer_id   text unique,
  razorpay_customer_id text unique,
  custom_domain        text unique,
  persona              text not null,
  city                 text,
  country              text,
  verified             boolean not null default false,
  page_live            boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 2. pages — Claude-generated content
-- ─────────────────────────────────────────────
create table if not exists pages (
  id              uuid primary key default uuid_generate_v4(),
  provider_id     uuid not null references providers(id) on delete cascade,
  headline        text,
  tagline         text,
  bio             text,
  services        jsonb not null default '[]',
  highlights      jsonb not null default '[]',
  palette         text not null default 'professional',
  font            text not null default 'inter'
                    check (font in ('inter','georgia','trebuchet')),
  template        text not null default 'focus'
                    check (template in ('focus','portfolio','clinic','storefront','premium')),
  seo_title       text,
  seo_description text,
  show_sections   jsonb not null default '{}',
  build_version   int not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (provider_id)
);

-- ─────────────────────────────────────────────
-- 3. onboarding_answers
-- ─────────────────────────────────────────────
create table if not exists onboarding_answers (
  id              uuid primary key default uuid_generate_v4(),
  provider_id     uuid not null references providers(id) on delete cascade,
  persona         text not null,
  answers         jsonb not null default '{}',
  claude_prompt   text,
  claude_response text,
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 4. bookings
-- ─────────────────────────────────────────────
create table if not exists bookings (
  id                 uuid primary key default uuid_generate_v4(),
  provider_id        uuid not null references providers(id) on delete cascade,
  customer_name      text not null,
  customer_phone     text not null,
  customer_email     text,
  service            text not null,
  preferred_date     text,
  message            text,
  status             text not null default 'pending'
                       check (status in ('pending','accepted','rejected','cancelled')),
  notification_sent  boolean not null default false,
  confirmation_sent  boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 5. notifications — log of every message sent
-- ─────────────────────────────────────────────
create table if not exists notifications (
  id              uuid primary key default uuid_generate_v4(),
  provider_id     uuid not null references providers(id) on delete cascade,
  booking_id      uuid references bookings(id) on delete set null,
  channel         text not null check (channel in ('whatsapp','email','sms')),
  recipient       text not null,
  message         text not null,
  delivery_status text not null default 'queued'
                    check (delivery_status in ('queued','sent','delivered','failed')),
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 6. support_tickets
-- ─────────────────────────────────────────────
create table if not exists support_tickets (
  id           uuid primary key default uuid_generate_v4(),
  provider_id  uuid not null references providers(id) on delete cascade,
  conversation jsonb not null default '[]',
  status       text not null default 'open'
                 check (status in ('open','ai_resolved','escalated','closed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 7. page_events — lightweight analytics
-- ─────────────────────────────────────────────
create table if not exists page_events (
  id           uuid primary key default uuid_generate_v4(),
  provider_id  uuid not null references providers(id) on delete cascade,
  event_type   text not null check (event_type in ('page_view','booking_click','whatsapp_click')),
  referrer     text,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
create index if not exists idx_pages_provider       on pages(provider_id);
create index if not exists idx_bookings_provider    on bookings(provider_id);
create index if not exists idx_bookings_status      on bookings(status);
create index if not exists idx_notifications_prov   on notifications(provider_id);
create index if not exists idx_page_events_prov     on page_events(provider_id);
create index if not exists idx_page_events_type     on page_events(event_type);
create index if not exists idx_support_provider     on support_tickets(provider_id);

-- ─────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_providers_updated_at
  before update on providers
  for each row execute function update_updated_at();

create or replace trigger trg_pages_updated_at
  before update on pages
  for each row execute function update_updated_at();

create or replace trigger trg_bookings_updated_at
  before update on bookings
  for each row execute function update_updated_at();

create or replace trigger trg_support_updated_at
  before update on support_tickets
  for each row execute function update_updated_at();

-- ─── PLANS (migration 20260702000006) ───────────────────────────────────────

create table if not exists plans (
  id           text primary key,
  name         text not null,
  emoji        text not null default '',
  tagline      text not null default '',
  usa_price    text,
  india_price  text,
  is_quote     boolean not null default false,
  popular      boolean not null default false,
  sort_order   int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists plan_features (
  id           uuid primary key default gen_random_uuid(),
  plan_id      text not null references plans(id) on delete cascade,
  label        text not null,
  description  text,
  feature_key  text,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create or replace trigger trg_plans_updated_at
  before update on plans
  for each row execute function update_updated_at();
