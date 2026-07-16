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

/** PNG badge image URL — horizontal 720×180 gradient (default) or legacy dark. */
export function memberBadgeUrl(slug: string, theme: 'gradient' | 'dark' = 'gradient'): string {
  // gradient is the default — no query param needed
  const q = theme === 'dark' ? '?theme=dark' : ''
  return `${APP_URL}/api/badge/${slug}${q}`
}

/** PNG badge image URL — square 1080×1080 Instagram / social card. */
export function memberBadgeSquareUrl(slug: string): string {
  return `${APP_URL}/api/badge/${slug}?format=square`
}

/**
 * Inline-HTML embed snippet for websites/blogs.
 * Amber gradient background with dark legible text — matches the new badge design.
 * Clicking opens the member's canonical page.
 * Optionally shows the member's display name and profession.
 */
export function badgeEmbedHtml(slug: string, opts?: { name?: string; persona?: string }): string {
  const url  = memberUrl(slug)
  const host = memberHost(slug)
  const name    = opts?.name
  const persona = opts?.persona

  // Text block — dark text on the light-amber part of the gradient (high contrast)
  const nameHtml = name
    ? `<span style="color:#0D0D0D;font-size:13px;font-weight:800;` +
      `letter-spacing:-0.2px;white-space:nowrap;line-height:1.1;display:block">${name}</span>` +
      (persona
        ? `<span style="color:#333333;font-size:11px;font-weight:500;` +
          `white-space:nowrap;line-height:1.3;display:block">${persona}</span>`
        : '') +
      `<span style="color:#555555;font-size:10px;white-space:nowrap;line-height:1.3;display:block">${host}</span>`
    : `<span style="color:#0D0D0D;font-size:13px;font-weight:700;` +
      `letter-spacing:0.01em;white-space:nowrap;display:block">${host}</span>`

  return (
    `<a href="${url}" target="_blank" rel="noopener noreferrer" ` +
    `style="display:inline-flex;align-items:center;gap:10px;` +
    `background:linear-gradient(100deg,#FFF8E8 0%,#FFE4A0 55%,#F5A623 100%);` +
    `border-radius:10px;padding:8px 14px 8px 8px;` +
    `text-decoration:none;font-family:sans-serif;` +
    `border:1px solid rgba(245,166,35,0.3)">` +
    // K mark — dark square so it pops on the amber end
    `<span style="display:inline-flex;align-items:center;justify-content:center;` +
    `width:30px;height:30px;background:#0D0D0D;border-radius:7px;` +
    `font-size:17px;font-weight:900;color:#F5A623;flex-shrink:0">K</span>` +
    `<span style="display:inline-flex;flex-direction:column;gap:1px">${nameHtml}</span>` +
    `</a>`
  )
}

/**
 * Image-based HTML embed snippet for email signatures.
 * Uses the /api/badge PNG (gradient horizontal) — works in clients that strip CSS/flex.
 */
export function badgeEmbedImgHtml(slug: string): string {
  const url    = memberUrl(slug)
  const imgUrl = memberBadgeUrl(slug)   // gradient default
  const host   = memberHost(slug)
  return (
    `<a href="${url}" target="_blank" rel="noopener noreferrer" ` +
    `style="display:inline-block;text-decoration:none">` +
    `<img src="${imgUrl}" alt="${host}" width="180" height="45" ` +
    `style="display:block;border:none;border-radius:5px" />` +
    `</a>`
  )
}
