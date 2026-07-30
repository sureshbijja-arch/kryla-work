import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ServicesSection from './ServicesSection'
import type { ProfileData } from '../../types'

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
