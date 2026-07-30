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
