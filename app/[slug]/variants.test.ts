import { describe, it, expect } from 'vitest'
import { getVariants, priceRange } from './variants'
import type { ServiceItem, ServiceVariant } from './types'

describe('getVariants', () => {
  it('returns the variants array as-is when present and non-empty', () => {
    const variants: ServiceVariant[] = [
      { size: '1 ft', price: '₹3,000' },
      { size: '2 ft', price: '₹5,500' },
    ]
    const item = { name: 'Idol', description: '', duration_or_unit: null, variants } as ServiceItem
    expect(getVariants(item)).toBe(variants)
  })

  it('synthesises a single variant from legacy duration_or_unit + price when variants is absent', () => {
    const item = {
      name: 'Natural Shadu Ganesh', description: '', duration_or_unit: '2 ft', price: '₹3,200',
    } as ServiceItem
    expect(getVariants(item)).toEqual([{ size: '2 ft', price: '₹3,200', compareAtPrice: null, includes: null }])
  })

  it('synthesises a single variant from legacy fields when variants is an empty array', () => {
    const item = {
      name: 'Idol', description: '', duration_or_unit: '3 ft', price: '₹9,000', variants: [],
    } as ServiceItem
    expect(getVariants(item)).toEqual([{ size: '3 ft', price: '₹9,000', compareAtPrice: null, includes: null }])
  })

  it('carries compareAtPrice into the synthesised legacy variant', () => {
    const item = {
      name: 'Gold-Finish Ganesh', description: '', duration_or_unit: '3.5 ft',
      price: '₹8,500', compareAtPrice: '₹9,800',
    } as ServiceItem
    expect(getVariants(item)).toEqual([
      { size: '3.5 ft', price: '₹8,500', compareAtPrice: '₹9,800', includes: null },
    ])
  })

  it('falls back to an empty size label when duration_or_unit is null (legacy row, no size ever set)', () => {
    const item = { name: 'Idol', description: '', duration_or_unit: null, price: '₹1,000' } as ServiceItem
    expect(getVariants(item)).toEqual([{ size: '', price: '₹1,000', compareAtPrice: null, includes: null }])
  })

  it('returns an empty array when there is no price at all (nothing purchasable)', () => {
    const item = { name: 'Idol', description: '', duration_or_unit: '2 ft', price: null } as ServiceItem
    expect(getVariants(item)).toEqual([])
  })
})

describe('priceRange', () => {
  it('returns a single display value when only one variant parses', () => {
    const r = priceRange([{ size: '2 ft', price: '₹3,200' }])
    expect(r).toEqual({ min: 3200, max: 3200, display: '₹3,200' })
  })

  it('returns a range display spanning min–max across variants', () => {
    const r = priceRange([
      { size: '1 ft', price: '₹3,000' },
      { size: '2 ft', price: '₹5,500' },
      { size: '3 ft', price: '₹9,999' },
    ])
    expect(r).toEqual({ min: 3000, max: 9999, display: '₹3,000 – ₹9,999' })
  })

  it('collapses to a single display value when min === max across variants', () => {
    const r = priceRange([
      { size: '1 ft', price: '₹3,000' },
      { size: '2 ft', price: '₹3,000' },
    ])
    expect(r).toEqual({ min: 3000, max: 3000, display: '₹3,000' })
  })

  it('ignores unparseable prices like "On request" when others parse', () => {
    const r = priceRange([
      { size: '1 ft', price: '₹3,000' },
      { size: '5–7 ft', price: 'On request' },
      { size: '3 ft', price: '₹9,999' },
    ])
    expect(r).toEqual({ min: 3000, max: 9999, display: '₹3,000 – ₹9,999' })
  })

  it('returns the raw string as display when nothing parses (e.g. all "On request")', () => {
    const r = priceRange([{ size: '5–7 ft', price: 'On request' }])
    expect(r).toEqual({ min: null, max: null, display: 'On request' })
  })

  it('returns null when the variant list is empty', () => {
    expect(priceRange([])).toBeNull()
  })

  it('preserves the original currency formatting (locale-agnostic — does not reformat)', () => {
    const r = priceRange([
      { size: '1 ft', price: '$40' },
      { size: '2 ft', price: '$95' },
    ])
    expect(r).toEqual({ min: 40, max: 95, display: '$40 – $95' })
  })
})
