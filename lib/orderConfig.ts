/**
 * lib/orderConfig.ts — types + validation for personas.order_config jsonb.
 *
 * Pure (no Supabase import, no 'react' cache) so it can be unit-tested
 * directly and imported from both server code (lib/personas.ts's
 * getOrderConfig) and 'use client' components (OrderModal/CustomOrderModal's
 * fallback constants) without pulling supabaseAdmin into the client bundle.
 *
 * Replaces the hardcoded bakery vocabulary (Birthday/Anniversary/Cake/
 * Cupcakes/"chocolate frosting, no nuts") that OrderModal.tsx and
 * CustomOrderModal.tsx used to bake in for every one of the 46 personas.
 */

export interface FulfillmentOption {
  key: string
  label: string
  areaPlaceholder?: string
}

export interface CustomOrderConfig {
  whatLabel: string
  whatOptions: string[]
  sizeLabel: string
  sizeOptions: string[]
  detailPlaceholders: { finish: string; design: string }
}

export interface OrderConfig {
  occasions: string[]
  notesPlaceholder: string
  fulfillment: FulfillmentOption[]
  customOrder: CustomOrderConfig
}

/** Generic fallback for any persona with no order_config row — preserves
 * today's bakery-shaped copy exactly, so a persona nobody has seeded yet
 * (or a DB error) never regresses to a blank/broken modal. This is the one
 * source of truth for that fallback; OrderModal/CustomOrderModal import it
 * directly rather than keeping their own duplicate copies in sync. */
export const DEFAULT_ORDER_CONFIG: OrderConfig = {
  occasions: ['Birthday', 'Anniversary', 'Wedding', 'Festive', 'Corporate', 'Graduation', 'Other'],
  notesPlaceholder: "e.g. Write 'Happy Birthday Priya', chocolate frosting, no nuts",
  fulfillment: [
    { key: 'pickup', label: 'Pickup' },
    { key: 'delivery', label: 'Delivery', areaPlaceholder: 'Delivery area / address' },
  ],
  customOrder: {
    whatLabel: 'What are you looking for?',
    whatOptions: ['Cake', 'Cupcakes', 'Cookies', 'Bread', 'Hamper', 'Other'],
    sizeLabel: 'Servings / Size',
    sizeOptions: ['Feeds 4–6', 'Feeds 8–10', 'Feeds 12–15', 'Feeds 20+', 'Not sure'],
    detailPlaceholders: {
      finish: 'e.g. Chocolate truffle, eggless vanilla, butterscotch',
      design: "e.g. 3-tier floral design, soft pink and gold, write 'Happy 30th Priya'",
    },
  },
}

function isFulfillmentOption(v: unknown): v is FulfillmentOption {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.key === 'string' && typeof o.label === 'string' &&
    (o.areaPlaceholder === undefined || typeof o.areaPlaceholder === 'string')
}

function isCustomOrderConfig(v: unknown): v is CustomOrderConfig {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  const dp = o.detailPlaceholders as Record<string, unknown> | undefined
  return (
    typeof o.whatLabel === 'string' &&
    Array.isArray(o.whatOptions) && o.whatOptions.every(x => typeof x === 'string') &&
    typeof o.sizeLabel === 'string' &&
    Array.isArray(o.sizeOptions) && o.sizeOptions.every(x => typeof x === 'string') &&
    typeof dp === 'object' && dp !== null &&
    typeof dp.finish === 'string' && typeof dp.design === 'string'
  )
}

/** Validates one order_config jsonb blob. Returns null on any structural
 * mismatch — callers fall back to DEFAULT_ORDER_CONFIG, never a partial or
 * `any`-typed shape. Filter, don't just cast — order_config is DB-editable
 * jsonb, not compiler-checked, so a malformed row (missing field, wrong
 * type) is dropped here rather than reaching the public order modal as
 * broken chips (same discipline as isMykrylaToolCard in
 * app/[slug]/mykryla/page.tsx). */
export function parseOrderConfig(raw: unknown): OrderConfig | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (!Array.isArray(o.occasions) || !o.occasions.every(x => typeof x === 'string')) return null
  if (typeof o.notesPlaceholder !== 'string') return null
  if (!Array.isArray(o.fulfillment) || o.fulfillment.length === 0 || !o.fulfillment.every(isFulfillmentOption)) return null
  if (!isCustomOrderConfig(o.customOrder)) return null
  return {
    occasions: o.occasions as string[],
    notesPlaceholder: o.notesPlaceholder,
    fulfillment: o.fulfillment as FulfillmentOption[],
    customOrder: o.customOrder as CustomOrderConfig,
  }
}
