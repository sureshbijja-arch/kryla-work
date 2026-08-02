import type { PaletteTokens } from '@/lib/layouts'

export interface SectionStyle {
  bg?: { type: 'color' | 'photo'; value: string }
  frames?: { enabled: boolean; count: 1 | 2 | 3 }
  size?: {
    space?: number       // vertical spacing multiplier on --space-section, 0.5–1.8, default 1
    heroHeight?: number  // hero only: min-height in svh, 40–100; unset = per-variant default
  }
}

export type PaletteKey  = 'professional' | 'fresh' | 'warm' | 'minimal' | 'creative' | 'calm'
export type FontKey     = 'inter' | 'georgia' | 'trebuchet'
export type TemplateKey = 'focus' | 'portfolio' | 'storefront' | 'clinic'
export type DesignMode  = 'craft' | 'editorial' | 'product'

export const DESIGN_MODE: Record<string, DesignMode> = {
  baker:       'craft',
  chef:        'craft',
  salon:       'craft',
  trainer:     'craft',
  other:       'craft',
  photographer:'editorial',
  doctor:      'editorial',
  musician:    'editorial',
  tutor:       'editorial',
}

export interface ServiceItem {
  name: string
  description: string
  duration_or_unit: string | null
  price?: string | null
  image_url?: string | null
  badge?: string | null
  /** Ganesh mockup fidelity — matches the approved mockup's 3-column spec row
   * (Height/Finish/Lead time) exactly. All optional/additive: the 45 other
   * personas' existing service rows simply don't have these keys. */
  finish?: string | null
  leadTime?: string | null
  /** "Was" price, rendered as a real strikethrough element above the bold
   * `price` ("now" price) — not folded into `price` as a typed string. */
  compareAtPrice?: string | null
}

/** A single fact-strip cell (Material/Sizes/Colours/Delivery for ganesh) —
 * mirrors HighlightItem/FaqItem's label/value-pair pattern, reusable by any
 * future persona without persona-specific column names. */
export interface FactItem {
  label: string
  value: string
}

/** Fixed footer-note content slot (kicker + sentence), rendered above the
 * platform Footer — distinct from reorderable/removable `sections` content. */
export interface FooterNote {
  kicker: string
  body: string
}

/** A single tab in the `story` bio variant (label + prose body) — mirrors
 * FactItem/HighlightItem's label/value-pair pattern, reusable by any future
 * persona without persona-specific column names. */
export interface StoryTab {
  label: string
  body: string
}

export interface HighlightItem {
  icon: string
  title: string
  body: string
}

export interface FaqItem {
  question: string
  answer: string
}

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface DayHours {
  open: string   // "09:00" 24h
  close: string  // "18:00" 24h
}

/** A per-date override that takes priority over the generic weekly schedule */
export interface HoursException {
  date:    string          // "YYYY-MM-DD"
  closed?: boolean         // true = closed all day; omit or false for special hours
  open?:   string          // "HH:MM" 24h — used when closed is falsy
  close?:  string          // "HH:MM" 24h — used when closed is falsy
  note?:   string          // optional label shown on the page, e.g. "Christmas"
}

export interface BusinessHours {
  timezone: string
  enabled: boolean
  mon: DayHours | null
  tue: DayHours | null
  wed: DayHours | null
  thu: DayHours | null
  fri: DayHours | null
  sat: DayHours | null
  sun: DayHours | null
  /** Per-date exceptions (holidays, leave, special hours). Absent means none. */
  exceptions?: HoursException[]
}

export interface ShowSections {
  hero: boolean
  services: boolean
  highlights: boolean
  booking: boolean
  faq: boolean
  contact: boolean
}

export interface Ad {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  linkUrl: string | null
}

export interface ProfileData {
  providerId: string
  firstName: string
  lastName: string
  persona: string
  location: string
  whatsappNumber: string | null
  whatsappPublic: boolean
  email: string | null
  instagramHandle?: string | null
  nextdoorUrl?: string | null
  headline: string
  subheadline: string
  bio: string
  ctaPrimary: string
  ctaSecondary: string
  services: ServiceItem[]
  highlights: HighlightItem[]
  faq: FaqItem[]
  palette: PaletteKey
  font: FontKey
  designMode: DesignMode
  pageBg?: string | null
  surface?: string | null
  borderColor?: string | null
  accentColor?: string | null
  paletteTokens?: PaletteTokens | null
  signatureColor?: string | null
  /** Ganesh-only override example (see LayoutRenderer). Full CSS font-family stacks, not bare family names. Null/absent = shared [data-mode] default. */
  displayFont?: string | null
  bodyFont?: string | null
  /** Ganesh-only override — literal CSS length values (e.g. '2px'), same
   * DB-driven-inline-custom-property mechanism as displayFont/bodyFont. */
  radiusCard?: string | null
  radiusBtn?: string | null
  showSections: ShowSections
  avatarUrl?: string | null
  gallery?: string[]
  menuFiles?: string[]
  ads?: Ad[]
  businessHours?: BusinessHours | null
  verified?: boolean
  heroFitCropTolerance?: number
  /** Fact-strip content (Material/Sizes/Colours/Delivery for ganesh) — array-
   * length-guarded like gallery/highlights, no ShowSections flag needed. */
  facts?: FactItem[]
  /** Fixed footer-note content slot — null/absent renders nothing. */
  footerNote?: FooterNote | null
  /** PDP-style "Includes" checklist (hero pdp variant) — array-length-guarded,
   * renders nothing when empty. Introduced for sellganeshidols v3 rebuild. */
  includes?: string[]
  /** Tabbed story content (bio `story` variant) — null/empty falls back to
   * rendering `bio` as a single untabbed column. */
  storyTabs?: StoryTab[]
}

export const ACCENT: Record<PaletteKey, string> = {
  professional: '#F5A623',
  fresh:        '#22C55E',
  warm:         '#EA8C00',
  minimal:      '#0D0D0D',
  creative:     '#9333EA',
  calm:         '#3B82F6',
}

// Fallback only when a page has no preset-sourced page_bg/surface/border_color
// (pre-theme-refresh pages, or pages that never applied a curated preset).
export const PAGE_BG: Record<PaletteKey, string> = {
  professional: '#FFFFFF',
  fresh:        '#F0FDF4',
  warm:         '#FFF7ED',
  minimal:      '#FFFFFF',
  creative:     '#FAF5FF',
  calm:         '#EFF6FF',
}

export const FONT_CLASS: Record<FontKey, string> = {
  inter:     'font-inter',
  georgia:   'font-georgia',
  trebuchet: 'font-trebuchet',
}

export function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}

export function instagramUrl(handle: string) {
  return `https://www.instagram.com/${handle.replace(/^@/, '')}/`
}

export function waUrl(whatsappNumber: string, firstName: string, headline?: string) {
  const num = whatsappNumber.replace(/\D/g, '')
  const text = headline
    ? `Hi ${firstName}, I found you on kryla.work — I'd like to enquire about ${headline}`
    : `Hi ${firstName}, I found you on kryla.work`
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}
