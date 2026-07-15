/**
 * lib/ecourts.ts — India eCourts helper: CNR validation and portal deep-link builder.
 *
 * v1 strategy: deep-link to the official eCourts portal (services.ecourts.gov.in).
 * The portals are CAPTCHA-gated / session-based so URL prefill is not guaranteed —
 * we copy the CNR to the user's clipboard and open the correct portal sub-page.
 * Portal base URLs are config-driven (system_config.court_tools.portals) — no
 * hardcoded URLs in this file.
 *
 * Pure functions only — no DB, no fetch (v1 is lookup-by-redirect, not API).
 */

export type PortalKind =
  | 'cnr_status'
  | 'case_status'
  | 'cause_list'
  | 'orders'
  | 'caveat'
  | 'process'

export interface CourtToolsConfig {
  enabled: boolean
  gating: { personas: string[]; regions: string[] }
  portals: Record<PortalKind, string>
}

export interface CourtDirectoryEntry {
  id:           string
  court_type:   'supreme' | 'high' | 'district' | 'tribunal'
  state:        string
  district:     string | null
  complex_name: string
  address:      string
  city:         string
  pincode:      string | null
  latitude:     number | null
  longitude:    number | null
  map_url:      string | null
}

// ── CNR validation ────────────────────────────────────────────────────────────

/**
 * Normalize a CNR number: trim whitespace and uppercase.
 * CNR format: 16 alphanumeric characters, e.g. MHAU010234562019
 */
export function normalizeCnr(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

/**
 * Validate a CNR number. Returns an error message or null if valid.
 * CNR = Case Number Record — 16 uppercase alphanumeric chars.
 */
export function validateCnr(cnr: string): string | null {
  const normalized = normalizeCnr(cnr)
  if (!normalized) return 'Please enter a CNR number.'
  if (!/^[A-Z0-9]{16}$/.test(normalized)) {
    return 'CNR must be 16 alphanumeric characters (e.g. MHAU010234562019).'
  }
  return null
}

// ── Portal URL builder ────────────────────────────────────────────────────────

/**
 * Build a portal URL for the given kind.
 *
 * eCourts v6 uses a POST-based form flow that is CAPTCHA-gated — we cannot
 * reliably prefill via GET params. We return the base portal sub-page URL so
 * the user can land on the right page, and we copy their CNR/value to clipboard
 * separately (handled in the UI) so they can paste past the CAPTCHA.
 *
 * The portals record comes from system_config so URLs can be updated without
 * a redeploy if eCourts changes their URL structure.
 */
export function buildPortalUrl(
  kind: PortalKind,
  portals: Record<string, string>,
): string {
  return portals[kind] ?? 'https://services.ecourts.gov.in/ecourtindia_v6/'
}

// ── Court locator helpers ─────────────────────────────────────────────────────

/**
 * Build a Google Maps link for a court complex.
 * Prefers map_url from the DB; falls back to a search-by-name URL.
 */
export function courtMapUrl(court: CourtDirectoryEntry): string {
  if (court.map_url) return court.map_url
  if (court.latitude != null && court.longitude != null) {
    return `https://maps.google.com/maps?q=${court.latitude},${court.longitude}`
  }
  const q = encodeURIComponent(`${court.complex_name}, ${court.city}`)
  return `https://maps.google.com/maps/search/?api=1&query=${q}`
}

/**
 * Human-readable label for a court_type value.
 */
export function courtTypeLabel(type: CourtDirectoryEntry['court_type']): string {
  switch (type) {
    case 'supreme':  return 'Supreme Court'
    case 'high':     return 'High Court'
    case 'district': return 'District Court'
    case 'tribunal': return 'Tribunal'
    default:         return 'Court'
  }
}

/**
 * Portal label shown in the UI for each lookup kind.
 */
export const PORTAL_LABELS: Record<PortalKind, string> = {
  cnr_status:  'CNR Status',
  case_status: 'Case Status',
  cause_list:  'Cause List',
  orders:      'Orders / Judgments',
  caveat:      'Caveat Search',
  process:     'Process / Service',
}
