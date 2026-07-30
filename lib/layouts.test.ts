import { describe, it, expect } from 'vitest'
import { enrichLayout } from './layouts'

describe('enrichLayout', () => {
  it('passes through a real palette_tokens object unchanged', () => {
    const result = enrichLayout({
      id: '1', name: 'Atelier', description: 'Elegant',
      template: 'storefront', palette: 'minimal', font: 'inter',
      palette_tokens: {
        accent: '#7B4B3A', accentSurface: '#7B4B3A0d',
        accentBorder: '#7B4B3A26', accentGlow: '#7B4B3A40',
        signature: '#C9A56A',
      },
    })
    expect(result.paletteTokens).toEqual({
      accent: '#7B4B3A', accentSurface: '#7B4B3A0d',
      accentBorder: '#7B4B3A26', accentGlow: '#7B4B3A40',
      signature: '#C9A56A',
    })
  })

  it('returns null paletteTokens when the row has none', () => {
    const result = enrichLayout({
      id: '2', name: 'Generic', description: 'Default',
      template: 'storefront', palette: 'professional', font: 'inter',
    })
    expect(result.paletteTokens).toBeNull()
  })
})
