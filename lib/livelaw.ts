/**
 * lib/livelaw.ts — LiveLaw RSS feed fetcher and parser.
 *
 * Pure fetch + normalise; no DB or gating logic here.
 * Called by the livelaw-sync Inngest cron function.
 *
 * Pattern mirrors lib/transcribe.ts: raw fetch, no extra packages,
 * typed error class, one exported async function.
 */

export interface LiveLawFeedConfig {
  category: string
  url: string
}

export interface LegalNewsItem {
  guid: string
  title: string
  link: string
  summary: string | null  // first 300 chars of description, HTML stripped
  category: string
  publishedAt: Date | null
}

export class LiveLawFetchError extends Error {
  constructor(
    message: string,
    public readonly code: 'fetch_failed' | 'parse_failed',
    public readonly feed: string,
  ) {
    super(message)
    this.name = 'LiveLawFetchError'
  }
}

/**
 * Strip HTML tags and decode common HTML entities.
 * Used to sanitise <description> into a plain-text summary.
 */
function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Extract the text content of a single RSS field, handling CDATA wrappers.
 * Returns empty string if the tag is absent.
 */
function extractField(block: string, tag: string): string {
  // Match <tag><![CDATA[…]]></tag> or <tag>…</tag>
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'i')
  const m = block.match(re)
  if (!m) return ''
  return (m[1] ?? m[2] ?? '').trim()
}

/**
 * Fetch and parse a single LiveLaw category RSS feed.
 * Throws LiveLawFetchError on network or parse failure.
 */
async function parseFeed(feed: LiveLawFeedConfig): Promise<LegalNewsItem[]> {
  let xml: string
  try {
    const res = await fetch(feed.url, {
      // Signal 5-second timeout — Node 18+ supports AbortSignal.timeout
      signal: AbortSignal.timeout(8_000),
      headers: { 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
    })
    if (!res.ok) {
      throw new LiveLawFetchError(
        `HTTP ${res.status} from ${feed.url}`,
        'fetch_failed',
        feed.url,
      )
    }
    xml = await res.text()
  } catch (err) {
    if (err instanceof LiveLawFetchError) throw err
    throw new LiveLawFetchError(
      `Network error fetching ${feed.url}: ${String(err)}`,
      'fetch_failed',
      feed.url,
    )
  }

  // Split on <item>…</item> blocks
  const itemBlocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []

  const items: LegalNewsItem[] = []

  for (const block of itemBlocks) {
    const guid  = extractField(block, 'guid')
    const title = extractField(block, 'title')
    const link  = extractField(block, 'link')

    if (!guid || !title || !link) continue   // skip malformed items

    const rawDesc   = extractField(block, 'description')
    const summary   = rawDesc ? stripHtml(rawDesc).slice(0, 300) || null : null

    const pubDateStr = extractField(block, 'pubDate')
    let publishedAt: Date | null = null
    if (pubDateStr) {
      const d = new Date(pubDateStr)
      if (!isNaN(d.getTime())) publishedAt = d
    }

    items.push({ guid, title, link, summary, category: feed.category, publishedAt })
  }

  return items
}

/**
 * Fetch all configured LiveLaw feeds in parallel and return a deduplicated
 * flat list of LegalNewsItem. Items whose feeds fail are skipped (logged to
 * console.error) so one bad feed doesn't abort the whole sync.
 */
export async function fetchLiveLawItems(
  feeds: LiveLawFeedConfig[],
): Promise<LegalNewsItem[]> {
  const results = await Promise.allSettled(feeds.map(parseFeed))

  const seen = new Set<string>()
  const items: LegalNewsItem[] = []

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'rejected') {
      console.error('[livelaw] feed fetch failed:', feeds[i].url, r.reason)
      continue
    }
    for (const item of r.value) {
      if (!seen.has(item.guid)) {
        seen.add(item.guid)
        items.push(item)
      }
    }
  }

  return items
}
