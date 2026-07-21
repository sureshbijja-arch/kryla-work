-- Likes were a single shared counter deduped only by client-side
-- localStorage — incognito/another device/cleared storage meant unlimited
-- re-likes, and there was no un-react. This table records one row per
-- (provider, visitor, day) so /api/track can dedupe and toggle server-side.
-- visitor_hash is a salted hash of the IP — no raw IP is stored.

create table if not exists page_reaction_hits (
  provider_id  uuid not null references providers(id) on delete cascade,
  visitor_hash text not null,
  day          date not null default current_date,
  created_at   timestamptz not null default now(),
  primary key (provider_id, visitor_hash, day)
);

create index if not exists idx_page_reaction_hits_provider on page_reaction_hits(provider_id);
