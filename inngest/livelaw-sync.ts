/**
 * inngest/livelaw-sync.ts — Cron: fetch LiveLaw RSS feeds → cache in legal_news.
 *
 * Cron: 0 *\/6 * * *  (every 6 hours UTC, matches config.refresh_hours default)
 *
 * Behaviour:
 *   1. Read system_config.livelaw_feed — if enabled=false, skip entirely.
 *   2. Fetch all configured RSS feeds via lib/livelaw.ts.
 *   3. Upsert items into legal_news on guid (deduplicated by RSS permalink).
 *   4. Prune rows older than retain_days to keep the table compact.
 *
 * All knobs (feeds, cadence doc, max_items, retain_days, gating, enabled)
 * live in system_config — no source deploy needed to change them.
 *
 * Registered in app/api/inngest/route.ts
 */

import { inngest }             from '@/lib/inngest'
import { supabaseAdmin }       from '@/lib/supabase/admin'
import { fetchLiveLawItems }   from '@/lib/livelaw'
import type { LiveLawFeedConfig } from '@/lib/livelaw'

interface LiveLawConfig {
  enabled: boolean
  refresh_hours: number
  max_items: number
  retain_days: number
  gating: { personas: string[]; regions: string[] }
  feeds: LiveLawFeedConfig[]
}

export const liveLawSyncFunction = inngest.createFunction(
  { id: 'livelaw-sync', name: 'LiveLaw RSS sync' },
  { cron: '0 */6 * * *' },   // every 6 h UTC; reflects refresh_hours default
  async ({ step }) => {

    // ── Step 1: load config ──────────────────────────────────────────────────
    const cfg = await step.run('load-livelaw-config', async () => {
      const { data } = await supabaseAdmin
        .from('system_config')
        .select('value')
        .eq('key', 'livelaw_feed')
        .single()
      return (data?.value ?? null) as LiveLawConfig | null
    })

    if (!cfg?.enabled) {
      console.log('[livelaw-sync] skipped — disabled in system_config')
      return { skipped: true }
    }

    const retainDays = cfg.retain_days ?? 14

    // ── Step 2: fetch RSS feeds ──────────────────────────────────────────────
    const items = await step.run('fetch-rss-feeds', async () => {
      return fetchLiveLawItems(cfg.feeds)
    })

    console.log(`[livelaw-sync] fetched ${items.length} item(s) across ${cfg.feeds.length} feed(s)`)

    // ── Step 3: upsert into legal_news ──────────────────────────────────────
    const upserted = await step.run('upsert-legal-news', async () => {
      if (items.length === 0) return 0

      const rows = items.map(item => ({
        guid:         item.guid,
        title:        item.title,
        link:         item.link,
        summary:      item.summary,
        category:     item.category,
        published_at: item.publishedAt ? new Date(item.publishedAt as unknown as string).toISOString() : null,
        fetched_at:   new Date().toISOString(),
      }))

      // Upsert: guid is UNIQUE — re-fetching the same article just updates fetched_at
      const { error, count } = await supabaseAdmin
        .from('legal_news')
        .upsert(rows, { onConflict: 'guid', count: 'exact' })

      if (error) {
        console.error('[livelaw-sync] upsert error:', error.message)
        throw error
      }

      return count ?? rows.length
    })

    console.log(`[livelaw-sync] upserted ${upserted} row(s)`)

    // ── Step 4: prune old rows ───────────────────────────────────────────────
    const pruned = await step.run('prune-old-news', async () => {
      const cutoff = new Date()
      cutoff.setUTCDate(cutoff.getUTCDate() - retainDays)

      const { error, count } = await supabaseAdmin
        .from('legal_news')
        .delete({ count: 'exact' })
        .lt('published_at', cutoff.toISOString())

      if (error) {
        // Non-fatal — log and continue
        console.error('[livelaw-sync] prune error:', error.message)
        return 0
      }

      return count ?? 0
    })

    console.log(`[livelaw-sync] pruned ${pruned} row(s) older than ${retainDays} days`)

    return { fetched: items.length, upserted, pruned }
  },
)
