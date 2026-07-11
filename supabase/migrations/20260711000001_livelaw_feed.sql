-- legal_news: cache of RSS items fetched from LiveLaw.
-- Refreshed by the livelaw-sync Inngest cron every 6 hours.
-- Deduplication is on guid (RSS permalink).

CREATE TABLE IF NOT EXISTS legal_news (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  guid         text        NOT NULL UNIQUE,        -- RSS <guid> — the canonical dedupe key
  title        text        NOT NULL,
  link         text        NOT NULL,
  summary      text,                               -- first 300 chars of <description>, stripped of HTML
  category     text        NOT NULL,               -- which feed (e.g. 'Top Stories', 'Supreme Court')
  published_at timestamptz,                        -- <pubDate> parsed; NULL if absent
  fetched_at   timestamptz NOT NULL DEFAULT now()  -- when we last wrote/refreshed this row
);

CREATE INDEX IF NOT EXISTS legal_news_published_at_idx ON legal_news (published_at DESC NULLS LAST);

-- ── system_config seed ──────────────────────────────────────────────────────
-- All LiveLaw feed settings live here. Update from /admin or direct SQL —
-- no source deploy needed to change feeds, cadence, or gating.

INSERT INTO system_config (key, value)
VALUES (
  'livelaw_feed',
  '{
    "enabled": true,
    "refresh_hours": 6,
    "max_items": 30,
    "retain_days": 14,
    "gating": { "personas": ["advocate"], "regions": ["india"] },
    "feeds": [
      { "category": "Top Stories",   "url": "https://www.livelaw.in/category/top-stories/feed" },
      { "category": "Supreme Court", "url": "https://www.livelaw.in/category/supreme-court/feed" },
      { "category": "High Courts",   "url": "https://www.livelaw.in/category/high-court/feed" }
    ]
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
