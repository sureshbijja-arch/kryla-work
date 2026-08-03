import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import HeroSection from './HeroSection'
import { IdolSelectionProvider } from '../IdolSelectionContext'
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

  it('renders the member\'s own name in the nav wordmark when set', () => {
    render(<HeroSection data={ganeshData} accent="#7A3B12" variant="pdp" />)
    // The member's first_name/last_name wins over personaConfig.navLabel —
    // editing the display name in MyKryla must be visible here. (Earlier
    // this was inverted: the static "Sell Ganesh Idols" wordmark always
    // won, so a saved display-name edit had no visible effect.)
    expect(screen.getByText('Ravi Kumar')).toBeTruthy()
  })

  it('falls back to the persona wordmark when no name is set yet', () => {
    render(<HeroSection data={{ ...ganeshData, firstName: '', lastName: '' }} accent="#7A3B12" variant="pdp" />)
    // personaConfig.navLabel is the fallback for a brand-new member who
    // hasn't set a display name yet — not a permanent override.
    expect(screen.getByText('Sell Ganesh Idols')).toBeTruthy()
  })

  it('renders a real, keyboard-reachable nav link for every nav item — no dead "Menu" span', () => {
    render(<HeroSection data={ganeshData} accent="#7A3B12" variant="pdp" />)
    // The prior shadu variant's nav had a static, non-interactive "Menu" span
    // with no target — the critique flagged this as a dead affordance
    // (designscreenshots critique, P2). Every nav item here is a real <a href>.
    // Target is '#idols' — the FactsSection idol-showcase grid (v3.1
    // rebuild), not the retired Collection grid's '#menu'.
    const menuLink = screen.getByRole('link', { name: 'Collections' })
    expect(menuLink.getAttribute('href')).toBe('#idols')
  })

  it('shows the selected idol\'s own single price when it has one size (v3.1 idol showcase)', () => {
    // Two distinct idols, one size each — this is what the old flat
    // services array actually modeled (a "size chip" that switched idols,
    // not sizes of one idol). The PDP shows the SELECTED idol's price here
    // (idol #1, Natural Shadu Ganesh, defaults selected) — a range across
    // unrelated idols would be meaningless. Picking a size WITHIN one idol
    // is covered by the multi-variant test below, the corrected version of
    // this behavior.
    render(
      <IdolSelectionProvider>
        <HeroSection data={ganeshData} accent="#7A3B12" variant="pdp" />
      </IdolSelectionProvider>
    )
    expect(screen.getByText('₹3,200')).toBeTruthy()
  })

  it('renders a size selector within one idol, and switches price + includes on selection', () => {
    const oneIdol = {
      ...ganeshData,
      services: [{
        name: 'Natural Shadu Ganesh', description: 'Unpainted natural clay finish.',
        image_url: null, duration_or_unit: null, price: null,
        variants: [
          { size: '1 ft', price: '₹3,000', includes: ['Small clay base'] },
          { size: '3 ft', price: '₹9,999', compareAtPrice: '₹11,000', includes: ['Stone base', 'Insured crate shipping'] },
        ],
      }],
    } as unknown as ProfileData

    render(
      <IdolSelectionProvider>
        <HeroSection data={oneIdol} accent="#7A3B12" variant="pdp" />
      </IdolSelectionProvider>
    )
    expect(screen.getByText('₹3,000 – ₹9,999')).toBeTruthy()
    const threeFt = screen.getByRole('button', { name: '3 ft' })
    fireEvent.click(threeFt)
    expect(screen.getByText('₹9,999')).toBeTruthy()
    expect(screen.getByText('₹11,000').className).toContain('line-through')
    // Includes swaps to this size's own list, not the page-level fallback.
    expect(screen.getByText('Stone base')).toBeTruthy()
    expect(screen.queryByText('Small clay base')).toBeNull()
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
