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

  it('renders the headline with no eyebrow label above it', () => {
    const { container } = render(<HeroSection data={ganeshData} accent="#8A4322" variant="shadu" />)
    expect(screen.getByText('Clay idols, made by hand, for home')).toBeTruthy()
    // The banned construction: a tracked-uppercase label naming the member,
    // rendered as its own element directly above the headline (see HeroDark/
    // HeroDabba's `fullName` eyebrow). Shadu must not render it at all.
    expect(screen.queryByText('Ravi Kumar')).toBeNull()
  })

  it('renders on a flat field via the .hero-shadu class hook', () => {
    const { container } = render(<HeroSection data={ganeshData} accent="#8A4322" variant="shadu" />)
    expect(container.querySelector('.hero-shadu')).toBeTruthy()
  })

  it('renders the lead-time notice when the persona config has one', () => {
    render(<HeroSection data={ganeshData} accent="#8A4322" variant="shadu" />)
    expect(screen.getByText('Advance orders recommended, especially before Ganesh Chaturthi')).toBeTruthy()
  })

  it('renders nothing invented when there is no lead-time notice or business hours', () => {
    render(<HeroSection data={{ ...ganeshData, persona: 'other' }} accent="#8A4322" variant="shadu" />)
    expect(screen.queryByText(/Advance orders recommended/)).toBeNull()
    // The CTA row itself still renders — only the optional notice/badge above it is absent.
    expect(screen.getByText('Book')).toBeTruthy()
  })
})
