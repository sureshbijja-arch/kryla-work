/**
 * lib/links.ts — single source of truth for all Kryla share/app URLs.
 * Use these helpers everywhere instead of constructing URLs inline so
 * the canonical form is consistent across server code, client components,
 * WhatsApp messages, manifests, and OG metadata.
 */

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kryla.work'
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL    ?? 'https://kryla.work'

/** Canonical public-page / customer-PWA URL for a member.
 *  Example: https://priya.kryla.work */
export function memberUrl(slug: string): string {
  return `https://${slug}.${APP_DOMAIN}`
}

/** Stable OG / share-card image URL (1200×630) for a member.
 *  Served at /api/share-card/[slug] on the apex domain so metadataBase resolves it. */
export function memberShareCardUrl(slug: string): string {
  return `${APP_URL}/api/share-card/${slug}`
}

/** PWA install-guide URL for a specific app. */
export function getAppUrl(slug: string, app: 'customer' | 'mychat'): string {
  return `${memberUrl(slug)}/get-app?app=${app}`
}

/** Canonical root-app URL (apex, no member slug). */
export const SITE_URL = APP_URL

// ── Badge helpers ─────────────────────────────────────────────────────────────

/** Host without protocol, e.g. "priya.kryla.work" — the badge's visible text. */
export function memberHost(slug: string): string {
  return `${slug}.${APP_DOMAIN}`
}

/** PNG badge image URL (~720×180, 2× crisp). Served on apex domain. */
export function memberBadgeUrl(slug: string, theme: 'dark' | 'light' = 'dark'): string {
  const q = theme === 'light' ? '?theme=light' : ''
  return `${APP_URL}/api/badge/${slug}${q}`
}

/**
 * Inline-SVG HTML embed snippet for websites/blogs.
 * Renders without an external image request — crisp at any size.
 * Clicking opens the member's canonical page.
 */
export function badgeEmbedHtml(slug: string): string {
  const url  = memberUrl(slug)
  const host = memberHost(slug)
  return (
    `<a href="${url}" target="_blank" rel="noopener noreferrer" ` +
    `style="display:inline-flex;align-items:center;gap:8px;` +
    `background:#0D0D0D;border-radius:8px;padding:6px 12px 6px 8px;` +
    `text-decoration:none;font-family:sans-serif">` +
    `<span style="display:inline-flex;align-items:center;justify-content:center;` +
    `width:24px;height:24px;background:#F5A623;border-radius:5px;` +
    `font-size:14px;font-weight:900;color:#0D0D0D;flex-shrink:0">K</span>` +
    `<span style="color:#FFFFFF;font-size:13px;font-weight:600;` +
    `letter-spacing:0.01em;white-space:nowrap">${host}</span>` +
    `</a>`
  )
}

/**
 * Image-based HTML embed snippet for email signatures.
 * Uses the /api/badge PNG so it works in clients that strip inline SVG/flex.
 */
export function badgeEmbedImgHtml(slug: string): string {
  const url    = memberUrl(slug)
  const imgUrl = memberBadgeUrl(slug, 'dark')
  const host   = memberHost(slug)
  return (
    `<a href="${url}" target="_blank" rel="noopener noreferrer" ` +
    `style="display:inline-block;text-decoration:none">` +
    `<img src="${imgUrl}" alt="${host}" width="180" height="45" ` +
    `style="display:block;border:none" />` +
    `</a>`
  )
}
