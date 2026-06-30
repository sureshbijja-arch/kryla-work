export type TemplateKey = 'focus' | 'portfolio' | 'storefront' | 'clinic'
export type PaletteKey  = 'professional' | 'fresh' | 'warm' | 'minimal' | 'creative' | 'calm'
export type FontKey     = 'inter' | 'georgia' | 'trebuchet'

export interface LayoutOption {
  id:          string
  name:        string
  description: string
  template:    TemplateKey
  palette:     PaletteKey
  font:        FontKey
  accent:      string
  bg:          string
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

export const TEMPLATE_LABEL: Record<TemplateKey, string> = {
  focus:      'Focus',
  portfolio:  'Portfolio',
  storefront: 'Storefront',
  clinic:     'Clinic',
}

export const FONT_LABEL: Record<FontKey, string> = {
  inter:     'Sans',
  georgia:   'Serif',
  trebuchet: 'Modern',
}

export const PERSONAS = [
  'tutor', 'trainer', 'baker', 'photographer',
  'salon', 'chef', 'doctor', 'musician', 'other', 'all',
] as const

export type PersonaKey = typeof PERSONAS[number]

// Enrich a raw DB row with derived accent / bg colours
export function enrichLayout(row: {
  id: string; name: string; description: string
  template: string; palette: string; font: string
}): LayoutOption {
  const palette = row.palette as PaletteKey
  return {
    id:          row.id,
    name:        row.name,
    description: row.description,
    template:    row.template as TemplateKey,
    palette,
    font:        row.font as FontKey,
    accent:      ACCENT[palette] ?? '#F5A623',
    bg:          PAGE_BG[palette] ?? '#FFFFFF',
  }
}
