import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import FactsSection from './FactsSection'
import { IdolSelectionProvider } from '../IdolSelectionContext'
import type { ProfileData } from '../../types'

afterEach(cleanup)

describe('FactsSection — strip variant (legacy, non-ganesh personas)', () => {
  const data = {
    facts: [
      { label: 'Material', value: 'Shadu clay' },
      { label: 'Sizes', value: '1 – 7 ft' },
    ],
    services: [],
  } as unknown as ProfileData

  it('renders each fact as a label/value cell', () => {
    render(<FactsSection data={data} variant="strip" />)
    expect(screen.getByText('Material')).toBeTruthy()
    expect(screen.getByText('Shadu clay')).toBeTruthy()
  })

  it('renders nothing when facts is empty', () => {
    const { container } = render(
      <FactsSection data={{ ...data, facts: [] }} variant="strip" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('falls back to Strip for any unrecognized variant', () => {
    render(<FactsSection data={data} variant="something-unknown" />)
    expect(screen.getByText('Material')).toBeTruthy()
  })
})

describe('FactsSection — idols variant (sellganeshidols idol showcase)', () => {
  const data = {
    persona: 'sellganeshidols',
    providerId: 'p1',
    services: [
      {
        name: 'Natural Shadu Ganesh', description: '', duration_or_unit: null, image_url: null,
        variants: [
          { size: '1 ft', price: '₹3,000' },
          { size: '2 ft', price: '₹5,500' },
        ],
      },
      {
        name: 'Gold-Finish Ganesh', description: '', duration_or_unit: '3.5 ft', price: '₹8,500', image_url: 'https://example.com/gold.jpg',
      },
    ],
  } as unknown as ProfileData

  it('renders one card per idol with name, size range, and price', () => {
    render(
      <IdolSelectionProvider>
        <FactsSection data={data} variant="idols" />
      </IdolSelectionProvider>
    )
    expect(screen.getByText('Natural Shadu Ganesh')).toBeTruthy()
    expect(screen.getByText('1 ft – 2 ft')).toBeTruthy()
    expect(screen.getByText('Gold-Finish Ganesh')).toBeTruthy()
  })

  it('renders a photo placeholder for idols with no image_url', () => {
    render(
      <IdolSelectionProvider>
        <FactsSection data={data} variant="idols" />
      </IdolSelectionProvider>
    )
    expect(screen.getByText('Add a photo')).toBeTruthy()
  })

  it('marks the first idol as selected (aria-pressed) by default', () => {
    render(
      <IdolSelectionProvider>
        <FactsSection data={data} variant="idols" />
      </IdolSelectionProvider>
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true')
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false')
  })

  it('clicking a card updates the shared selection to that idol', () => {
    render(
      <IdolSelectionProvider>
        <FactsSection data={data} variant="idols" />
      </IdolSelectionProvider>
    )
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[1])
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true')
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false')
  })

  it('renders nothing when there are no services', () => {
    const { container } = render(
      <IdolSelectionProvider>
        <FactsSection data={{ ...data, services: [] }} variant="idols" />
      </IdolSelectionProvider>
    )
    expect(container.firstChild).toBeNull()
  })

  it('works without a provider (falls back to uncontrolled default selection)', () => {
    render(<FactsSection data={data} variant="idols" />)
    expect(screen.getByText('Natural Shadu Ganesh')).toBeTruthy()
  })
})
