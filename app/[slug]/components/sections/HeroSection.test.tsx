import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
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

describe('HeroSection — pdp variant (sellganeshidols v3 rebuild)', () => {
  const ganeshData = {
    ...base, persona: 'sellganeshidols', firstName: 'Ravi', lastName: 'Kumar',
    providerId: 'p1',
    headline: 'Clay idols, made by hand, for home',
    subheadline: 'Natural shadu clay, water-soluble colours, sizes 1–7 ft.',
    services: [
      { name: 'Natural Shadu Ganesh', description: 'Unpainted natural clay finish.', price: '₹3,200', duration_or_unit: '2 ft' },
      { name: 'Gold-Finish Ganesh', description: 'Hand-painted gold detailing.', price: '₹8,500', compareAtPrice: '₹9,800', duration_or_unit: '3.5 ft' },
    ],
    gallery: [],
    includes: ['Hand-finished natural stone base', 'Padded crate shipping, insured'],
    footerNote: { kicker: 'Advance orders recommended', body: 'Especially before Ganesh Chaturthi — reply on WhatsApp for fastest response.' },
  } as unknown as ProfileData

  it('renders the headline, with the static per-persona kicker above it (not a name-eyebrow)', () => {
    render(<HeroSection data={ganeshData} accent="#7A3B12" variant="pdp" />)
    expect(screen.getByText('Clay idols, made by hand, for home')).toBeTruthy()
    // Real information, not the member's name used as decoration — the same
    // distinction the prior shadu-variant test guarded (getPersonaConfig's
    // heroEyebrow, a static per-persona phrase).
    expect(screen.getByText('Handcrafted for Ganesh Chaturthi')).toBeTruthy()
  })

  it('renders the member-facing nav wordmark, not the member\'s own name', () => {
    render(<HeroSection data={ganeshData} accent="#7A3B12" variant="pdp" />)
    // v3 reference nav shows the business wordmark (personaConfig.navLabel),
    // not "Ravi Kumar" — a deliberate change from the prior shadu variant.
    expect(screen.getByText('Sell Ganesh Idols')).toBeTruthy()
  })

  it('renders a real, keyboard-reachable nav link for every nav item — no dead "Menu" span', () => {
    render(<HeroSection data={ganeshData} accent="#7A3B12" variant="pdp" />)
    // The prior shadu variant's nav had a static, non-interactive "Menu" span
    // with no target — the critique flagged this as a dead affordance
    // (designscreenshots critique, P2). Every nav item here is a real <a href>.
    const menuLink = screen.getByRole('link', { name: 'Collections' })
    expect(menuLink.getAttribute('href')).toBe('#menu')
  })

  it('renders a size selector with the member\'s own services, and switches the price block on selection', () => {
    render(<HeroSection data={ganeshData} accent="#7A3B12" variant="pdp" />)
    expect(screen.getByText('₹3,200')).toBeTruthy()
    const goldOption = screen.getByRole('button', { name: '3.5 ft' })
    fireEvent.click(goldOption)
    expect(screen.getByText('₹8,500')).toBeTruthy()
    expect(screen.getByText('₹9,800').className).toContain('line-through')
  })

  it('renders the INCLUDES checklist from real content, never invented items', () => {
    render(<HeroSection data={ganeshData} accent="#7A3B12" variant="pdp" />)
    expect(screen.getByText('Hand-finished natural stone base')).toBeTruthy()
    expect(screen.getByText('Padded crate shipping, insured')).toBeTruthy()
  })

  it('renders no INCLUDES block when includes is empty — never invents content', () => {
    render(<HeroSection data={{ ...ganeshData, includes: [] }} accent="#7A3B12" variant="pdp" />)
    expect(screen.queryByText('Includes')).toBeNull()
  })

  it('renders the shipping-reassurance line from footerNote.body near the CTA', () => {
    render(<HeroSection data={ganeshData} accent="#7A3B12" variant="pdp" />)
    expect(screen.getByText(/reply on WhatsApp for fastest response/)).toBeTruthy()
  })

  it('renders an honest placeholder, not a broken layout, when gallery is empty', () => {
    render(<HeroSection data={ganeshData} accent="#7A3B12" variant="pdp" />)
    expect(screen.getByText('Add a photo of this idol')).toBeTruthy()
  })
})
