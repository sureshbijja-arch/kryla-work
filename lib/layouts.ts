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

// accent + bg match the values in app/[slug]/types.ts ACCENT / PAGE_BG
const ACCENT: Record<PaletteKey, string> = {
  professional: '#F5A623',
  fresh:        '#22C55E',
  warm:         '#EA8C00',
  minimal:      '#0D0D0D',
  creative:     '#9333EA',
  calm:         '#3B82F6',
}
const BG: Record<PaletteKey, string> = {
  professional: '#FFFFFF',
  fresh:        '#F0FDF4',
  warm:         '#FFF7ED',
  minimal:      '#FFFFFF',
  creative:     '#FAF5FF',
  calm:         '#EFF6FF',
}

function layout(
  id: string, name: string, description: string,
  template: TemplateKey, palette: PaletteKey, font: FontKey,
): LayoutOption {
  return { id, name, description, template, palette, font, accent: ACCENT[palette], bg: BG[palette] }
}

const PERSONA_LAYOUTS: Record<string, LayoutOption[]> = {
  tutor: [
    layout('tutor-academic',  'Academic',       'Clean and trustworthy',     'focus',      'professional', 'inter'),
    layout('tutor-creative',  'Creative Studio','Expressive and colourful',   'portfolio',  'creative',     'georgia'),
    layout('tutor-fresh',     'Fresh Start',    'Light and approachable',     'focus',      'fresh',        'inter'),
    layout('tutor-editorial', 'Editorial',      'Refined serif elegance',     'portfolio',  'professional', 'georgia'),
  ],
  trainer: [
    layout('trainer-perf',    'Performance',    'Bold and energetic',         'focus',      'fresh',        'inter'),
    layout('trainer-power',   'Power',          'Dark and impactful',         'focus',      'minimal',      'inter'),
    layout('trainer-studio',  'Studio',         'Modern service showcase',    'storefront', 'fresh',        'inter'),
    layout('trainer-calm',    'Recovery',       'Calming wellness feel',      'focus',      'calm',         'georgia'),
  ],
  baker: [
    layout('baker-artisan',   'Artisan',        'Warm handcrafted vibe',      'portfolio',  'warm',         'georgia'),
    layout('baker-modern',    'Modern Bakery',  'Clean product showcase',     'storefront', 'professional', 'inter'),
    layout('baker-cozy',      'Cozy Kitchen',   'Friendly and personal',      'focus',      'warm',         'trebuchet'),
    layout('baker-creative',  'Sweet Studio',   'Playful and creative',       'portfolio',  'creative',     'trebuchet'),
  ],
  photographer: [
    layout('photo-portfolio', 'Portfolio',      'Imagery-first minimal look', 'portfolio',  'minimal',      'inter'),
    layout('photo-editorial', 'Editorial',      'Refined magazine style',     'portfolio',  'professional', 'georgia'),
    layout('photo-creative',  'Creative',       'Bold and expressive',        'portfolio',  'creative',     'inter'),
    layout('photo-fresh',     'Lifestyle',      'Light and fresh',            'portfolio',  'fresh',        'inter'),
  ],
  salon: [
    layout('salon-luxe',      'Luxe',           'Elegant and premium',        'storefront', 'creative',     'georgia'),
    layout('salon-clean',     'Clean & Modern', 'Minimal and sophisticated',  'storefront', 'minimal',      'inter'),
    layout('salon-warm',      'Warm Glow',      'Welcoming and personal',     'focus',      'warm',         'trebuchet'),
    layout('salon-fresh',     'Fresh',          'Bright and modern',          'storefront', 'fresh',        'inter'),
  ],
  chef: [
    layout('chef-restaurant', 'Restaurant',     'Rich and inviting',          'storefront', 'warm',         'georgia'),
    layout('chef-modern',     'Modern Kitchen', 'Clean culinary showcase',    'storefront', 'professional', 'inter'),
    layout('chef-rustic',     'Rustic',         'Earthy and authentic',       'portfolio',  'warm',         'trebuchet'),
    layout('chef-creative',   'Fusion',         'Bold and playful',           'portfolio',  'creative',     'inter'),
  ],
  doctor: [
    layout('doc-clinical',    'Clinical',       'Professional medical layout','clinic',     'calm',         'inter'),
    layout('doc-executive',   'Executive',      'Authoritative and clean',    'focus',      'professional', 'inter'),
    layout('doc-wellness',    'Wellness',       'Approachable and calming',   'focus',      'fresh',        'georgia'),
    layout('doc-modern',      'Modern Practice','Contemporary clinic feel',   'clinic',     'professional', 'inter'),
  ],
  musician: [
    layout('music-stage',     'Stage',          'Bold and expressive',        'focus',      'creative',     'trebuchet'),
    layout('music-acoustic',  'Acoustic',       'Warm and intimate',          'portfolio',  'calm',         'georgia'),
    layout('music-minimal',   'Minimal',        'Let your work speak',        'portfolio',  'minimal',      'inter'),
    layout('music-fresh',     'Indie',          'Bright and independent',     'focus',      'fresh',        'trebuchet'),
  ],
  other: [
    layout('other-pro',       'Professional',   'Clean and credible',         'focus',      'professional', 'inter'),
    layout('other-portfolio', 'Creative',       'Show off your work',         'portfolio',  'creative',     'georgia'),
    layout('other-modern',    'Modern',         'Sleek service showcase',     'storefront', 'minimal',      'inter'),
    layout('other-fresh',     'Friendly',       'Warm and approachable',      'focus',      'fresh',        'inter'),
  ],
}

export function getLayouts(persona: string): LayoutOption[] {
  return PERSONA_LAYOUTS[persona] ?? PERSONA_LAYOUTS.other
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
