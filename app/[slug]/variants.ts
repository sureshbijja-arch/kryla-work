import type { ServiceItem, ServiceVariant } from './types'

/**
 * Every render path (PDP size chips, facts-strip idol cards, order modal)
 * reads variants through this function rather than `item.variants` directly,
 * so legacy rows — which predate the idol→variants model and just have a
 * flat `duration_or_unit` + `price` — keep working without a data migration
 * touching every persona's existing catalogue.
 */
export function getVariants(item: ServiceItem): ServiceVariant[] {
  if (item.variants && item.variants.length > 0) return item.variants
  if (!item.price) return []
  return [{
    size: item.duration_or_unit ?? '',
    price: item.price,
    compareAtPrice: item.compareAtPrice ?? null,
    includes: null,
  }]
}

export interface PriceRange {
  /** Lowest parsed numeric price, or null if nothing parsed. */
  min: number | null
  /** Highest parsed numeric price, or null if nothing parsed. */
  max: number | null
  /** What to render: "₹3,200", "₹3,000 – ₹9,999", or the raw string
   * ("On request") when no variant price parsed as a number. */
  display: string
}

/** Pulls the numeric magnitude out of a free-form price string like
 * '₹3,200' or '$95' — strips everything but digits and the decimal point.
 * Returns null for non-numeric strings like 'On request'. */
function parsePrice(price: string): number | null {
  const cleaned = price.replace(/[^\d.]/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Computes the price range to show on the PDP before a size is picked.
 * Prices are free-form strings (no numeric column, no currency type — see
 * ServiceItem.price), so this parses digits out of each variant's price,
 * ignores variants that don't parse (e.g. "On request"), and only ever
 * renders a real "min – max" range when at least two distinct numeric
 * prices exist. Never fabricates a range from a single value.
 */
export function priceRange(variants: ServiceVariant[]): PriceRange | null {
  if (variants.length === 0) return null

  const parsed = variants
    .map(v => ({ variant: v, value: parsePrice(v.price) }))
    .filter((p): p is { variant: ServiceVariant; value: number } => p.value !== null)

  if (parsed.length === 0) {
    // Nothing parsed — show the first variant's raw price string as-is
    // (e.g. a single "On request" idol, or every size is quote-only).
    return { min: null, max: null, display: variants[0].price }
  }

  const min = Math.min(...parsed.map(p => p.value))
  const max = Math.max(...parsed.map(p => p.value))

  if (min === max) {
    const single = parsed.find(p => p.value === min)!.variant.price
    return { min, max, display: single }
  }

  const minDisplay = parsed.find(p => p.value === min)!.variant.price
  const maxDisplay = parsed.find(p => p.value === max)!.variant.price
  return { min, max, display: `${minDisplay} – ${maxDisplay}` }
}
