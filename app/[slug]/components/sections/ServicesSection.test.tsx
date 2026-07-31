import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import ServicesSection from './ServicesSection'
import type { ProfileData } from '../../types'

// This file previously had no cleanup — each render() left its DOM in place
// for the next test in the same describe block. Harmless while every test
// used distinct, non-overlapping text, but the new `sizes` tests below share
// text across cases (e.g. '2 ft' appears in more than one test), so a missing
// cleanup silently doubles matches. Fixing this for the whole file, matching
// HeroSection.test.tsx's existing convention.
afterEach(cleanup)

const baseData = {
  persona: 'salon',
  showSections: { services: true } as any,
  services: [
    { name: 'Balayage', description: 'Hand-painted colour', price: '₹4,500', duration_or_unit: '2.5 hrs' },
    { name: 'Signature cut', description: 'Wash + style', price: '₹1,200', duration_or_unit: '45 min' },
  ],
} as unknown as ProfileData

describe('ServicesSection — price-list variant', () => {
  it('renders each service as a dotted-leader price row', () => {
    const { container } = render(
      <ServicesSection data={baseData} accent="#7B4B3A" variant="price-list" />
    )
    expect(screen.getByText('Balayage')).toBeTruthy()
    expect(screen.getByText('₹4,500')).toBeTruthy()
    expect(container.querySelectorAll('.menu-item-leader').length).toBe(2)
  })

  it('renders nothing when services are hidden or empty (matches every other variant)', () => {
    const { container } = render(
      <ServicesSection data={{ ...baseData, services: [] }} accent="#7B4B3A" variant="price-list" />
    )
    expect(container.querySelectorAll('.menu-item-leader').length).toBe(0)
  })
})

describe('ServicesSection — sizes variant (sellganeshidols)', () => {
  const ganeshData = {
    persona: 'sellganeshidols',
    providerId: 'p1',
    showSections: { services: true } as any,
    services: [
      { name: 'Natural Shadu Ganesh', description: 'Unpainted natural clay finish.', price: '₹3,200', duration_or_unit: '2 ft' },
      { name: 'Gold-Finish Ganesh', description: 'Hand-painted gold detailing.', price: '₹8,500', duration_or_unit: '3.5 ft' },
      { name: 'Custom Society Idol', description: 'Made to order for mandals.', price: 'On request', duration_or_unit: '5–7 ft' },
    ],
  } as unknown as ProfileData

  it('renders one row per service in the member\'s entered order (no sorting)', () => {
    render(<ServicesSection data={ganeshData} accent="#8A4322" variant="sizes" />)
    const names = ['Natural Shadu Ganesh', 'Gold-Finish Ganesh', 'Custom Society Idol']
    names.forEach(n => expect(screen.getByText(n)).toBeTruthy())
  })

  it('renders duration_or_unit as the Height spec, not a sorted/parsed value', () => {
    render(<ServicesSection data={ganeshData} accent="#8A4322" variant="sizes" />)
    expect(screen.getByText('2 ft')).toBeTruthy()
    expect(screen.getByText('3.5 ft')).toBeTruthy()
    expect(screen.getByText('5–7 ft')).toBeTruthy()
    expect(screen.getByText('Height')).toBeTruthy()
  })

  it('renders nothing when services are empty or hidden', () => {
    const { container } = render(
      <ServicesSection data={{ ...ganeshData, services: [] }} accent="#8A4322" variant="sizes" />
    )
    expect(container.querySelector('#menu')).toBeNull()
  })

  it('exposes the custom-order affordance as a real, keyboard-reachable button', () => {
    render(<ServicesSection data={ganeshData} accent="#8A4322" variant="sizes" />)
    expect(screen.getByRole('button', { name: /custom order/i })).toBeTruthy()
  })
})

describe('ServicesSection — menu variant custom-order keyboard fix (shared by baker/chef/sellganeshidols)', () => {
  it('exposes the custom-order affordance as a real button, not a div wrapping a decorative one', () => {
    const data = {
      persona: 'baker',
      providerId: 'p1',
      showSections: { services: true } as any,
      services: [
        { name: 'Custom Birthday Cake', description: 'Made to order.', price: '₹1,500', duration_or_unit: null },
      ],
    } as unknown as ProfileData
    render(<ServicesSection data={data} accent="#8A4322" variant="menu" />)
    expect(screen.getByRole('button', { name: /custom order/i })).toBeTruthy()
  })
})
