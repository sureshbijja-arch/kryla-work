import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import HeroSection from './HeroSection'
import type { ProfileData } from '../../types'

afterEach(cleanup)

const base = {
  firstName: 'Aanya', lastName: 'Mehra', persona: 'salon', location: 'Bandra',
  headline: 'Hair that catches the light', subheadline: 'Balayage and cuts.',
  ctaPrimary: 'Book', ctaSecondary: 'Ask',
  showSections: { booking: true, contact: true },
  services: [], avatarUrl: null, gallery: ['/img/a.jpg'],
} as unknown as ProfileData

describe('HeroSection — sweep variant', () => {
  it('renders the headline over a photo ground with a sweep element', () => {
    const { container } = render(<HeroSection data={base} accent="#7B4B3A" variant="sweep" />)
    expect(screen.getByText('Hair that catches the light')).toBeTruthy()
    expect(container.querySelector('.hero-sweep')).toBeTruthy()
  })
})

describe('HeroSection — dabba variant', () => {
  const tiffinData = {
    ...base, persona: 'other', headline: 'A dabba that tastes like home',
    services: [
      { name: 'Roti + Rice', description: '4 rotis', price: '', duration_or_unit: '' },
      { name: 'Dal Tadka', description: '', price: '', duration_or_unit: '' },
      { name: 'Bhindi Masala', description: '', price: '', duration_or_unit: '' },
    ],
  } as unknown as ProfileData

  it('renders one compartment per real service, no placeholders', () => {
    render(<HeroSection data={tiffinData} accent="#D68A2E" variant="dabba" />)
    expect(screen.getByText('Roti + Rice')).toBeTruthy()
    expect(screen.getByText('Dal Tadka')).toBeTruthy()
    expect(screen.getByText('Bhindi Masala')).toBeTruthy()
  })

  it('renders fewer compartments when fewer services exist — never invents content', () => {
    render(<HeroSection data={{ ...tiffinData, services: [
      { name: 'Roti + Rice', description: '', price: '', duration_or_unit: '' },
    ] }} accent="#D68A2E" variant="dabba" />)
    expect(screen.getByText('Roti + Rice')).toBeTruthy()
    expect(screen.queryByText('Dal Tadka')).toBeNull()
  })
})

describe('HeroSection — shadu variant (sellganeshidols)', () => {
  const ganeshData = {
    ...base, persona: 'sellganeshidols', firstName: 'Ravi', lastName: 'Kumar',
    headline: 'Clay idols, made by hand, for home',
    subheadline: 'Natural shadu clay, water-soluble colours, sizes 1–7 ft.',
    services: [],
  } as unknown as ProfileData

  it('renders the headline, with the static per-persona kicker above it (not a name-eyebrow)', () => {
    render(<HeroSection data={ganeshData} accent="#8A4322" variant="shadu" />)
    expect(screen.getByText('Clay idols, made by hand, for home')).toBeTruthy()
    // Matches the approved mockup exactly: a static, per-persona phrase above
    // the headline (getPersonaConfig's heroEyebrow) — real information, not
    // the member's name used as decoration. The banned construction this
    // still guards against is a tracked-uppercase label naming the member,
    // rendered as its own element above the headline (see HeroDark/HeroDabba's
    // `fullName` eyebrow at HeroSection.tsx:445/695) — that pattern is still
    // absent from Shadu's headline block; the member's name appears only in
    // the nav row, alongside the wordmark, matching the mockup's nav layout.
    expect(screen.getByText('Handcrafted for Ganesh Chaturthi')).toBeTruthy()
  })

  it('renders the member name in the nav row (mockup: wordmark + business name)', () => {
    render(<HeroSection data={ganeshData} accent="#8A4322" variant="shadu" />)
    expect(screen.getByText('Ravi Kumar')).toBeTruthy()
  })

  it('renders on a flat field via the .hero-shadu class hook', () => {
    const { container } = render(<HeroSection data={ganeshData} accent="#8A4322" variant="shadu" />)
    expect(container.querySelector('.hero-shadu')).toBeTruthy()
  })

  it('does not render a lead-time pill in the hero body — season notice lives in the footer only', () => {
    render(<HeroSection data={ganeshData} accent="#8A4322" variant="shadu" />)
    // Matches the approved mockup exactly: HeroShadu's own body has no
    // lead-time/season-notice pill (moved to FooterNoteSection per the
    // design-audit follow-up) — only the CTA row and optional business-hours
    // badge render below the subheadline.
    expect(screen.queryByText(/Advance orders recommended/)).toBeNull()
    expect(screen.getByText('Book')).toBeTruthy()
  })
})
