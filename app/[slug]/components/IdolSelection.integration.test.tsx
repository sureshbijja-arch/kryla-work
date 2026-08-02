import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import HeroSection from './sections/HeroSection'
import FactsSection from './sections/FactsSection'
import { IdolSelectionProvider } from './IdolSelectionContext'
import type { ProfileData } from '../types'

afterEach(cleanup)

/**
 * Covers the cross-section requirement directly: clicking an idol card in
 * FactsSection's idol showcase must load that idol into HeroSection's PDP —
 * the two are siblings under LayoutRenderer, wired only through
 * IdolSelectionContext (see LayoutRenderer.tsx), so a unit test on either
 * component alone can't catch a regression here.
 */
describe('Idol selection — FactsSection card click drives HeroSection PDP', () => {
  const data = {
    firstName: 'Ravi', lastName: 'Kumar', persona: 'sellganeshidols', providerId: 'p1',
    headline: 'Clay idols, made by hand, for home', subheadline: 'Natural shadu clay.',
    ctaPrimary: 'Enquire', ctaSecondary: 'See sizes',
    showSections: { booking: true, contact: true },
    gallery: [], includes: [],
    services: [
      { name: 'Natural Shadu Ganesh', description: '', image_url: null, duration_or_unit: '2 ft', price: '₹3,200' },
      { name: 'Gold-Finish Ganesh', description: '', image_url: null, duration_or_unit: '3.5 ft', price: '₹8,500' },
    ],
  } as unknown as ProfileData

  it('clicking the second idol card updates the PDP to show that idol\'s name and price', () => {
    render(
      <IdolSelectionProvider>
        <HeroSection data={data} accent="#7A3B12" variant="pdp" />
        <FactsSection data={data} variant="idols" />
      </IdolSelectionProvider>
    )

    // Defaults to the first idol — assert on the PDP's own price element
    // specifically (a font-display-token span), since the showcase card
    // below also renders a '₹3,200'-derived string.
    const pdpPrice = () => document.querySelector('.font-display-token.text-3xl')
    expect(pdpPrice()?.textContent).toBe('₹3,200')

    const goldCard = screen.getByRole('button', { name: /Gold-Finish Ganesh/ })
    fireEvent.click(goldCard)

    expect(pdpPrice()?.textContent).toBe('₹8,500')
  })

  it('clicking a card scrolls the PDP into view', () => {
    const scrollSpy = vi.fn()
    render(
      <IdolSelectionProvider>
        <HeroSection data={data} accent="#7A3B12" variant="pdp" />
        <FactsSection data={data} variant="idols" />
      </IdolSelectionProvider>
    )
    // jsdom has no real layout engine; scrollIntoView must be stubbed per-element.
    const section = document.querySelector('section')!
    section.scrollIntoView = scrollSpy

    const goldCard = screen.getByRole('button', { name: /Gold-Finish Ganesh/ })
    fireEvent.click(goldCard)

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })
})
