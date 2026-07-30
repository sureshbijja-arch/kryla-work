import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import LayoutRenderer from './LayoutRenderer'
import type { ProfileData } from '../types'

const baseData = {
  providerId: 'p1', firstName: 'Aanya', lastName: 'Mehra', persona: 'salon',
  palette: 'minimal', font: 'inter', designMode: 'craft',
  services: [], highlights: [], faq: [],
  showSections: { booking: true, contact: true } as any,
} as unknown as ProfileData

describe('LayoutRenderer — signature token', () => {
  it('emits --color-signature from paletteTokens when present', () => {
    const { container } = render(
      <LayoutRenderer sections={[]} data={{ ...baseData, paletteTokens: {
        accent: '#7B4B3A', accentSurface: '#7B4B3A0d', accentBorder: '#7B4B3A26',
        accentGlow: '#7B4B3A40', signature: '#C9A56A',
      } } as ProfileData} />
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.getPropertyValue('--color-signature')).toBe('#C9A56A')
    expect(wrapper.style.getPropertyValue('--color-accent')).toBe('#7B4B3A')
  })

  it('falls back to accent when no paletteTokens or signatureColor set (byte-identical regression case)', () => {
    const { container } = render(
      <LayoutRenderer sections={[]} data={{ ...baseData, paletteTokens: null, signatureColor: null } as ProfileData} />
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.getPropertyValue('--color-accent')).toBe('#0D0D0D') // ACCENT['minimal']
    expect(wrapper.style.getPropertyValue('--color-signature')).toBe('#0D0D0D') // reuses accent, never invents
  })
})
