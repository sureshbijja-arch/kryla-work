import React from 'react'
import { Footer } from './shared'
import AnimateIn from './AnimateIn'
import SmartImg from './SmartImg'
import HeroSection from './sections/HeroSection'
import ServicesSection from './sections/ServicesSection'
import HighlightsSection from './sections/HighlightsSection'
import BioSection from './sections/BioSection'
import GallerySection from './sections/GallerySection'
import FaqSection from './sections/FaqSection'
import ContactSection from './sections/ContactSection'
import ReviewsSection from './sections/ReviewsSection'
import { ACCENT, PAGE_BG, FONT_CLASS } from '../types'
import type { ProfileData, PaletteKey, FontKey, DesignMode, SectionStyle } from '../types'

export interface SectionEntry {
  sectionKey: string
  variant: string
  order: number
  style?: SectionStyle
}

interface Props {
  sections: SectionEntry[]
  data: ProfileData
}

export default function LayoutRenderer({ sections, data }: Props) {
  const tokens     = data.paletteTokens
  const accent     = data.accentColor ?? tokens?.accent ?? ACCENT[data.palette as PaletteKey] ?? '#F5A623'
  const signature  = data.signatureColor ?? tokens?.signature ?? accent
  const bg         = data.pageBg      ?? PAGE_BG[data.palette as PaletteKey] ?? '#FFFFFF'
  const surface    = data.surface     ?? '#FFFFFF'
  const borderCol  = data.borderColor ?? 'var(--kryla-border)'
  const fontClass  = FONT_CLASS[data.font as FontKey]        ?? 'font-inter'
  const designMode = (data.designMode ?? 'craft') as DesignMode

  const sorted = [...sections].sort((a, b) => a.order - b.order)

  function resolveVariant(sectionKey: string, variant: string): string {
    if (variant !== 'auto' || sectionKey !== 'hero') return variant
    if (data.gallery && data.gallery.length > 0) return 'photo'
    if (data.avatarUrl) return designMode === 'editorial' ? 'centered' : 'split'
    return 'dark'
  }

  // Wraps a rendered section with its per-section style overrides: background
  // (color/photo) and vertical spacing (--space-section multiplier).
  function wrapSection(node: React.ReactNode, style: SectionStyle | undefined, key: number): React.ReactNode {
    // Vertical spacing override — every section reads var(--space-section) for
    // its padding (hero variants read it as a multiple, e.g. calc(...* .7)).
    // Setting it on this wrapper rescales all of that with no per-section-
    // component changes. Undefined ⇒ no wrapper contribution ⇒ pixel-identical
    // to before this feature existed.
    const spaceMult = style?.size?.space
    const spaceVars: React.CSSProperties = spaceMult
      ? { ['--space-section' as string]: `calc(var(--space-section) * ${Math.min(1.8, Math.max(0.5, spaceMult))})` }
      : {}

    const bgCfg = style?.bg
    if (!bgCfg) {
      if (!spaceMult) return node
      return <div key={`size-${key}`} style={spaceVars}>{node}</div>
    }

    if (bgCfg.type === 'color') {
      return (
        <div key={`bg-${key}`} style={{ ['--sec-custom-bg' as string]: bgCfg.value, background: bgCfg.value, ...spaceVars }}>
          {node}
        </div>
      )
    }

    return (
      <div key={`bg-${key}`} className="relative overflow-hidden" style={{ ['--sec-custom-bg' as string]: 'transparent', ...spaceVars }}>
        {/* 'auto' fit fills the section edge-to-edge like cover for a normal
            photo, but automatically switches to a blurred-fill backdrop when
            the image's ratio is far enough from the section's that cover
            would crop it heavily — same behavior as the hero background. */}
        <SmartImg src={bgCfg.value} fit="auto" focus="50% 50%" cropTolerance={data.heroFitCropTolerance} className="absolute inset-0 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,0.42)' }} />
        <div className="relative z-10">{node}</div>
      </div>
    )
  }

  return (
    <div
      data-mode={designMode}
      style={{
        background: bg,
        ['--section-bg' as string]:          bg,
        ['--color-surface' as string]:       surface,
        ['--color-border' as string]:        borderCol,
        ['--color-accent' as string]:         accent,
        ['--color-accent-surface' as string]: data.accentColor ? `${accent}0d` : (tokens?.accentSurface ?? `${accent}0d`),
        ['--color-accent-border' as string]:  data.accentColor ? `${accent}26` : (tokens?.accentBorder  ?? `${accent}26`),
        ['--color-accent-glow' as string]:    data.accentColor ? `${accent}40` : (tokens?.accentGlow    ?? `${accent}40`),
        ['--color-signature' as string]:      signature,
        // Per-persona display/body font override (currently sellganeshidols
        // only — see supabase/migrations/20260731090000_ganesh_theme_font_columns.sql).
        // A CSS custom property set here always wins over the shared
        // [data-mode] blocks in globals.css by specificity, so this is
        // additive and inert for every persona whose display_font/body_font
        // is null: .font-display-token/.font-heading-token keep resolving to
        // Fraunces, and fontClass (below) keeps applying unchanged. Not part
        // of the member-selectable FontKey/FONT_CLASS enum — reachable only
        // via this DB-driven field, never choosable by other personas.
        ...(data.displayFont ? {
          ['--font-display' as string]: data.displayFont,
          ['--font-heading' as string]: data.displayFont,
        } : {}),
        ...(data.bodyFont ? { fontFamily: data.bodyFont } : {}),
      }}
      className={`min-h-screen ${fontClass}`}
    >
      <main>
        {sorted.map((s, i) => {
          const variant = resolveVariant(s.sectionKey, s.variant)
          let node: React.ReactNode = null
          switch (s.sectionKey) {
            case 'hero':
              node = <HeroSection key={i} data={data} accent={accent} variant={variant} framesConfig={s.style?.frames} heroHeight={s.style?.size?.heroHeight} />
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
            case 'reviews':
              node = <ReviewsSection key={i} providerId={data.providerId} accentColor={accent} />
              break
            default:
              return null
          }
          const wrapped = wrapSection(node, s.style, i)
          if (s.sectionKey === 'hero') return wrapped
          return <AnimateIn key={i} delay={Math.min(i * 60, 240)}>{wrapped}</AnimateIn>
        })}
      </main>
      <Footer />
    </div>
  )
}
