import { Footer } from './shared'
import HeroSection from './sections/HeroSection'
import ServicesSection from './sections/ServicesSection'
import HighlightsSection from './sections/HighlightsSection'
import BioSection from './sections/BioSection'
import GallerySection from './sections/GallerySection'
import FaqSection from './sections/FaqSection'
import ContactSection from './sections/ContactSection'
import { ACCENT, PAGE_BG, FONT_CLASS } from '../types'
import type { ProfileData, PaletteKey, FontKey } from '../types'

export interface SectionEntry {
  sectionKey: string
  variant: string
  order: number
}

interface Props {
  sections: SectionEntry[]
  data: ProfileData
}

export default function LayoutRenderer({ sections, data }: Props) {
  const accent   = ACCENT[data.palette as PaletteKey]   ?? '#F5A623'
  const bg       = PAGE_BG[data.palette as PaletteKey]  ?? '#FFFFFF'
  const fontClass = FONT_CLASS[data.font as FontKey]    ?? 'font-inter'

  const sorted = [...sections].sort((a, b) => a.order - b.order)

  return (
    <div style={{ background: bg, ['--section-bg' as string]: bg }} className={`min-h-screen ${fontClass}`}>
      {sorted.map((s, i) => {
        const isFirst = i === 0
        switch (s.sectionKey) {
          case 'hero':
            return <HeroSection key={i} data={data} accent={accent} variant={s.variant} showNav={isFirst} />
          case 'services':
            return <ServicesSection key={i} data={data} accent={accent} variant={s.variant} />
          case 'highlights':
            return <HighlightsSection key={i} data={data} accent={accent} variant={s.variant} />
          case 'bio':
            return <BioSection key={i} data={data} accent={accent} variant={s.variant} />
          case 'gallery':
            return <GallerySection key={i} data={data} variant={s.variant} />
          case 'faq':
            return <FaqSection key={i} data={data} variant={s.variant} />
          case 'contact':
            return <ContactSection key={i} data={data} accent={accent} variant={s.variant} />
          default:
            return null
        }
      })}
      <Footer />
    </div>
  )
}
