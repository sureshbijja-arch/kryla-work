/**
 * Pure builders for schema.org JSON-LD blocks used on member public pages.
 * No I/O — callers fetch data (Supabase) and pass plain values in.
 * Every builder omits fields/returns null when the underlying data is absent,
 * so callers can spread the result straight into a <script> tag without
 * emitting empty/misleading structured data.
 */
import type { BusinessHours, DayKey, FaqItem } from '@/app/[slug]/types'

export interface EntityInput {
  /** 'Person' | 'Organization' | 'LocalBusiness' or any other stored schema_type */
  type: string
  name: string
  /** Canonical, self-referencing URL — e.g. https://priya.kryla.work */
  url: string
  /** Share-card or avatar image URL, if available */
  image?: string | null
  description?: string | null
  telephone?: string | null
  addressLocality?: string | null
  /** External profile URLs (Instagram, Nextdoor, etc.) */
  sameAs?: string[]
}

export interface ReviewInput {
  rating: number
  status: string
}

const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_TO_SCHEMA: Record<DayKey, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

/**
 * Self-referencing entity block — tells search engines this subdomain is its
 * own independent site/entity (Person, Organization, or LocalBusiness),
 * distinct from the page-specific schema_type block already on the page.
 */
export function buildEntityJsonLd(input: EntityInput): Record<string, unknown> {
  const sameAs = (input.sameAs ?? []).filter(Boolean)
  return {
    '@context': 'https://schema.org',
    '@type': input.type,
    name: input.name,
    url: input.url,
    ...(input.image ? { image: input.image } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.telephone ? { telephone: input.telephone } : {}),
    ...(input.addressLocality
      ? { address: { '@type': 'PostalAddress', addressLocality: input.addressLocality } }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
  }
}

/**
 * AggregateRating from published reviews. Returns null when there are no
 * published reviews — an aggregateRating with ratingCount 0 is invalid schema
 * and can trigger a Search Console manual-action warning, so we omit it
 * entirely rather than emit a zero.
 */
export function buildAggregateRating(reviews: ReviewInput[]): Record<string, unknown> | null {
  const published = reviews.filter((r) => r.status === 'published')
  if (published.length === 0) return null

  const sum = published.reduce((acc, r) => acc + r.rating, 0)
  const average = sum / published.length

  return {
    '@type': 'AggregateRating',
    ratingValue: Number(average.toFixed(1)),
    reviewCount: published.length,
    bestRating: 5,
    worstRating: 1,
  }
}

/**
 * openingHoursSpecification array from BusinessHours. Returns null when hours
 * are disabled or absent. Per-date `exceptions` have no clean recurring-schema
 * equivalent and are intentionally not represented — the weekly pattern is
 * the useful signal for rich results.
 */
export function buildOpeningHours(hours: BusinessHours | null): Record<string, unknown>[] | null {
  if (!hours || !hours.enabled) return null

  const specs = DAY_ORDER
    .map((day) => ({ day, hours: hours[day] }))
    .filter((d): d is { day: DayKey; hours: { open: string; close: string } } => d.hours !== null)
    .map(({ day, hours: h }) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_TO_SCHEMA[day],
      opens: h.open,
      closes: h.close,
    }))

  return specs.length ? specs : null
}

/**
 * FAQPage JSON-LD — schema.org requires FAQPage to be a distinct top-level
 * entity (not nested inside another @type), so callers render this as a
 * SECOND <script> tag alongside the entity/profile block, never merged in.
 */
export function buildFaqJsonLd(faq: FaqItem[]): Record<string, unknown> | null {
  const valid = faq.filter((f) => f.question && f.answer)
  if (valid.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: valid.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  }
}
