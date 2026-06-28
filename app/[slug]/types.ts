export type PaletteKey = 'professional' | 'fresh' | 'warm' | 'minimal' | 'creative' | 'calm'
export type FontKey    = 'inter' | 'georgia' | 'trebuchet'
export type TemplateKey = 'focus' | 'portfolio' | 'storefront' | 'clinic'

export interface ServiceItem {
  name: string
  description: string
  duration_or_unit: string | null
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

export interface ShowSections {
  hero: boolean
  services: boolean
  highlights: boolean
  booking: boolean
  faq: boolean
  contact: boolean
}

export interface ProfileData {
  providerId: string
  firstName: string
  lastName: string
  persona: string
  location: string
  whatsappNumber: string | null
  email: string | null
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
  showSections: ShowSections
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

export function waUrl(whatsappNumber: string, firstName: string) {
  const num = whatsappNumber.replace(/\D/g, '')
  return `https://wa.me/${num}?text=Hi%20${encodeURIComponent(firstName)}!%20I%20found%20you%20on%20Kryla.`
}
