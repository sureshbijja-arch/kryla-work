-- Phase C: Reviews / testimonials

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  author_name text not null,
  rating      int not null default 5 check (rating between 1 and 5),
  body        text,
  status      text not null default 'published'
                check (status in ('published','hidden')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_reviews_provider on reviews(provider_id);
create index if not exists idx_reviews_status   on reviews(provider_id, status);
