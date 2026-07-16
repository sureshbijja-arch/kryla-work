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
