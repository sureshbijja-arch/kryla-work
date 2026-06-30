import React from 'react'
import { Footer } from './shared'
import AnimateIn from './AnimateIn'
import HeroSection from './sections/HeroSection'
import ServicesSection from './sections/ServicesSection'
import HighlightsSection from './sections/HighlightsSection'
import BioSection from './sections/BioSection'
import GallerySection from './sections/GallerySection'
import FaqSection from './sections/FaqSection'
import ContactSection from './sections/ContactSection'
import { ACCENT, PAGE_BG, FONT_CLASS } from '../types'
import type { ProfileData, PaletteKey, FontKey, DesignMode } from '../types'

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
  const accent     = ACCENT[data.palette as PaletteKey]      ?? '#F5A623'
  const bg         = PAGE_BG[data.palette as PaletteKey]     ?? '#FFFFFF'
  const fontClass  = FONT_CLASS[data.font as FontKey]        ?? 'font-inter'
  const designMode = (data.designMode ?? 'craft') as DesignMode

  const sorted = [...sections].sort((a, b) => a.order - b.order)

  // Resolve auto variant for hero based on member content
  function resolveVariant(sectionKey: string, variant: string): string {
    if (variant !== 'auto' || sectionKey !== 'hero') return variant
    if (data.gallery && data.gallery.length > 0) return 'photo'
    if (data.avatarUrl) return designMode === 'editorial' ? 'centered' : 'split'
    return 'dark'
  }

  return (
    <div
      data-mode={designMode}
      style={{
        background: bg,
        ['--section-bg' as string]:          bg,
        ['--color-accent' as string]:         accent,
        ['--color-accent-surface' as string]: `${accent}0d`,
        ['--color-accent-border' as string]:  `${accent}26`,
        ['--color-accent-glow' as string]:    `${accent}40`,
      }}
      className={`min-h-screen ${fontClass}`}
    >
      {sorted.map((s, i) => {
        const isFirst = i === 0
        const variant = resolveVariant(s.sectionKey, s.variant)
        let node: React.ReactNode = null
        switch (s.sectionKey) {
          case 'hero':
            node = <HeroSection key={i} data={data} accent={accent} variant={variant} showNav={isFirst} />
            break
          case 'services':
            node = <ServicesSection key={i} data={data} accent={accent} variant={variant} />
            break
          case 'highlights':
            node = <HighlightsSection key={i} data={data} accent={accent} variant={variant} />
            break
          case 'bio':
            node = <BioSection key={i} data={data} accent={accent} variant={variant} />
            break
          case 'gallery':
            node = <GallerySection key={i} data={data} variant={variant} />
            break
          case 'faq':
            node = <FaqSection key={i} data={data} accent={accent} variant={variant} />
            break
          case 'contact':
            node = <ContactSection key={i} data={data} accent={accent} variant={variant} />
            break
          default:
            return null
        }
        // Hero renders immediately — every other section fades up on scroll
        if (s.sectionKey === 'hero') return node
        return <AnimateIn key={i} delay={0}>{node}</AnimateIn>
      })}
      <Footer />
    </div>
  )
}
