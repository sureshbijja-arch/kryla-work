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
 * Compact "Find me" card — avatar left, name + profession right,
 * host URL + K mark at the bottom. Warm cream, no heavy black.
 * Clicking opens the member's canonical page.
 */
export function badgeEmbedHtml(
  slug: string,
  opts?: { name?: string; persona?: string; avatarUrl?: string }
): string {
  const url     = memberUrl(slug)
  const host    = memberHost(slug)
  const name    = opts?.name
  const persona = opts?.persona
  const av      = opts?.avatarUrl
  const initial = name ? name[0].toUpperCase() : host[0].toUpperCase()

  // Avatar — image if available, else initial circle
  const avatarHtml = av
    ? `<img src="${av}" alt="" style="` +
      `width:48px;height:48px;border-radius:50%;object-fit:cover;` +
      `flex-shrink:0;border:2px solid #F5A623;display:block" />`
    : `<span style="` +
      `display:inline-flex;align-items:center;justify-content:center;` +
      `width:48px;height:48px;border-radius:50%;` +
      `background:#FFF0D6;border:2px solid #F5A623;` +
      `font-size:21px;font-weight:700;color:#F5A623;` +
      `flex-shrink:0;font-family:sans-serif">${initial}</span>`

  // Name + profession text block (charcoal, warm muted brown — no black)
  const nameHtml = name
    ? `<span style="color:#1A1A1A;font-size:13px;font-weight:800;letter-spacing:-0.2px;white-space:nowrap;line-height:1.1;display:block">${name}</span>` +
      (persona
        ? `<span style="color:#8A6D3B;font-size:11px;font-weight:500;white-space:nowrap;line-height:1.3;margin-top:3px;display:block">${persona}</span>`
        : '')
    : `<span style="color:#1A1A1A;font-size:12px;font-weight:700;white-space:nowrap;display:block">${host}</span>`

  return (
    // Outer card — cream bg, warm orange border, no heavy black
    `<a href="${url}" target="_blank" rel="noopener noreferrer" ` +
    `style="display:inline-flex;flex-direction:column;width:220px;` +
    `background:#FFFBF2;border-radius:14px;overflow:hidden;` +
    `border:1.5px solid rgba(245,166,35,0.30);` +
    `box-shadow:0 4px 16px rgba(0,0,0,0.06);` +
    `text-decoration:none;font-family:sans-serif">` +

    // Top row — avatar + text
    `<span style="display:inline-flex;align-items:center;gap:12px;padding:16px 16px 12px">` +
    avatarHtml +
    `<span style="display:inline-flex;flex-direction:column;gap:3px;flex:1;min-width:0">${nameHtml}</span>` +
    `</span>` +

    // Warm divider
    `<span style="display:block;height:1px;background:#EFE3CC;margin:0 14px"></span>` +

    // Bottom row — host left, "Find me on K" right
    `<span style="display:inline-flex;align-items:center;justify-content:space-between;padding:10px 14px 14px">` +
    `<span style="color:#5A5245;font-size:10px;font-weight:500;white-space:nowrap">${host}</span>` +
    `<span style="display:inline-flex;align-items:center;gap:5px">` +
    `<span style="color:#8A6D3B;font-size:9px;font-weight:500">Find me on</span>` +
    `<span style="display:inline-flex;align-items:center;justify-content:center;` +
    `width:17px;height:17px;background:#F5A623;border-radius:4px;` +
    `font-size:11px;font-weight:900;color:#1A1A1A">K</span>` +
    `</span>` +
    `</span>` +
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
    `<img src="${imgUrl}" alt="${host}" width="220" height="130" ` +
    `style="display:block;border:none;border-radius:10px" />` +
    `</a>`
  )
}
