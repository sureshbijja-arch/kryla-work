export interface SectionStyle {
  bg?: { type: 'color' | 'photo'; value: string }
  frames?: { enabled: boolean; count: 1 | 2 | 3 }
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
  showSections: ShowSections
  avatarUrl?: string | null
  gallery?: string[]
  menuFiles?: string[]
  ads?: Ad[]
  businessHours?: BusinessHours | null
  verified?: boolean
}

export const ACCENT: Record<PaletteKey, string> = {
  professional: '#F5A623',
  fresh:        '#22C55E',
  warm:         '#EA8C00',
  minimal:      '#0D0D0D',
  creative:     '#9333EA',
  calm:         '#3B82F6',
}

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
