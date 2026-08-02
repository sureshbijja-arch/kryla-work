/**
 * scripts/seed-e2e-provider.mjs
 *
 * Idempotently seeds a deterministic test-salon provider + one pending booking, so
 * Playwright's authenticated project (see playwright.config.ts) has a known account to log
 * into via app/api/test/login/route.ts, and Task 8's e2e test has a pending booking to Accept.
 *
 * Also seeds a second, standalone test-ganesh provider (slug e2e-test-ganesh, persona
 * sellganeshidols) WITH a real `pages` row (the salon provider above has none — it exists
 * only for the authenticated MyKryla dashboard flow, not for visiting a public page).
 * e2e-test-ganesh is what /e2e-test-ganesh/preview needs to render the v3-rebuild HeroPdp +
 * Collection + Story variants end-to-end (designscreenshots/sellganeshidolsv3.pdf), matching
 * the approved copy: Natural Shadu Ganesh (2ft, ₹3,200), Gold-Finish Ganesh (3.5ft, ₹8,500
 * was ₹9,800), Custom Society Idol (5-7ft, on request). Seeded as a SEPARATE provider rather
 * than repointing e2e-test-salon, since the authenticated Playwright project depends on that
 * provider's persona staying 'salon'.
 *
 * This is NOT executed by any sandboxed/CI environment automatically — a human must run it
 * once against the real dev/test Supabase project before authenticated e2e tests can pass.
 *
 * Requires env vars (same ones the app itself needs, loaded from your shell or .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   E2E_TEST_PROVIDER_EMAIL   (the email this script seeds the provider row under)
 *
 * Usage:
 *   node scripts/seed-e2e-provider.mjs
 *   # or, to load .env.local first:
 *   npx dotenv -e .env.local -- node scripts/seed-e2e-provider.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TEST_EMAIL = process.env.E2E_TEST_PROVIDER_EMAIL

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  process.exit(1)
}
if (!TEST_EMAIL) {
  console.error('Missing E2E_TEST_PROVIDER_EMAIL in environment — this must match the value the')
  console.error('app/api/test/login route checks against.')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const TEST_SLUG = 'e2e-test-salon'

async function seedSalonProvider() {
  // Upsert on slug (the unique key for providers) so re-running this script is a no-op
  // beyond refreshing the row — never creates duplicates.
  const { data: provider, error: providerError } = await supabaseAdmin
    .from('providers')
    .upsert(
      {
        slug: TEST_SLUG,
        first_name: 'E2E',
        last_name: 'Test Salon',
        persona: 'salon',
        location: 'Test City',
        email: TEST_EMAIL,
        whatsapp_number: '15550000000',
        plan: 'thrive',
        plan_status: 'active',
        region: 'usa',
        page_live: true,
        verified: false,
      },
      { onConflict: 'slug' }
    )
    .select('id, slug')
    .single()

  if (providerError || !provider) {
    console.error('Failed to upsert test provider:', providerError)
    process.exit(1)
  }

  console.log(`Seeded provider: slug=${provider.slug} id=${provider.id}`)

  // Seed a pending booking with a preferred_date/preferred_slot so Task 8's e2e test has
  // something to Accept. Idempotency: only insert if no pending booking already exists for
  // this provider with the same marker in the message field.
  const SEED_MARKER = 'seeded-by-scripts/seed-e2e-provider.mjs'

  const { data: existingBooking } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('provider_id', provider.id)
    .eq('message', SEED_MARKER)
    .maybeSingle()

  if (existingBooking) {
    console.log(`Pending booking already seeded (id=${existingBooking.id}) — skipping insert.`)
    return
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const preferredDate = tomorrow.toISOString().slice(0, 10)

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .insert({
      provider_id: provider.id,
      customer_name: 'Playwright Test Customer',
      customer_phone: '15559999999',
      client_email: 'e2e-customer@example.com',
      service: 'Haircut',
      preferred_date: preferredDate,
      preferred_slot: '10:00 AM',
      message: SEED_MARKER,
      status: 'pending',
      notification_sent: true,
      confirmation_sent: true,
    })
    .select('id')
    .single()

  if (bookingError || !booking) {
    console.error('Failed to insert seed booking:', bookingError)
    process.exit(1)
  }

  console.log(`Seeded pending booking: id=${booking.id} preferred_date=${preferredDate}`)
}

const GANESH_TEST_SLUG = 'e2e-test-ganesh'

async function seedGaneshProvider() {
  const { data: provider, error: providerError } = await supabaseAdmin
    .from('providers')
    .upsert(
      {
        slug: GANESH_TEST_SLUG,
        first_name: 'E2E',
        last_name: 'Test Ganesh',
        persona: 'sellganeshidols',
        location: 'Hyderabad',
        email: TEST_EMAIL,
        whatsapp_number: '15550000001',
        plan: 'thrive',
        plan_status: 'active',
        region: 'india',
        page_live: true,
        verified: false,
      },
      { onConflict: 'slug' }
    )
    .select('id, slug')
    .single()

  if (providerError || !provider) {
    console.error('Failed to upsert ganesh test provider:', providerError)
    process.exit(1)
  }

  console.log(`Seeded provider: slug=${provider.slug} id=${provider.id}`)

  // sellganeshidols' own palette_tokens/signature_color/display_font/body_font/
  // radius_card/radius_btn/page_bg/surface/border_color (see
  // supabase/migrations/20260731090000_ganesh_theme_font_columns.sql and
  // 20260801090000_ganesh_v3_theme.sql) — a page normally gets these from
  // build-page.ts at signup time, but this script writes the pages row
  // directly rather than going through Inngest, so it must set the same
  // fields itself to exercise the real render path. Copy below matches the
  // approved v3 reference (designscreenshots/sellganeshidolsv3.pdf) — CTA
  // labels, service specs, compareAtPrice, facts strip, footer note,
  // includes checklist, and story tabs all mirror that reference.
  const pageRow = {
    provider_id: provider.id,
    headline: 'Clay idols, made by hand, for home',
    subheadline: 'Natural shadu clay, water-soluble colours, sizes 1–7 ft. Advance orders open now for this season.',
    bio: 'Handcrafted Ganesh idols for over a decade, natural shadu clay only.',
    cta_primary: 'Enquire / Order',
    cta_secondary: 'See sizes',
    services: [
      {
        name: 'Natural Shadu Ganesh', description: 'Unpainted natural clay finish, dissolves cleanly. Our most-loved size for home visarjan.',
        price: '₹3,200', duration_or_unit: '2 ft', finish: 'Natural clay', leadTime: '7–10 days',
      },
      {
        name: 'Gold-Finish Ganesh', description: 'Hand-painted gold detailing over natural clay base, brass-tone ornamentation.',
        price: '₹8,500', compareAtPrice: '₹9,800', duration_or_unit: '3.5 ft', finish: 'Gold detail', leadTime: '10–14 days',
      },
      {
        name: 'Custom Society Idol', description: 'Made to order for housing societies and mandals. Share your reference; we quote within a day.',
        price: 'On request', duration_or_unit: '5–7 ft', finish: 'Custom', leadTime: '3–4 weeks',
      },
    ],
    highlights: [],
    faq: [],
    facts: [
      { label: 'Material', value: 'Shadu clay' },
      { label: 'Sizes', value: '1 – 7 ft' },
      { label: 'Colours', value: 'Natural · gold' },
      { label: 'Delivery', value: 'Doorstep' },
    ],
    footer_note: {
      kicker: 'Advance orders recommended',
      body: 'Especially before Ganesh Chaturthi — reply on WhatsApp for fastest response.',
    },
    includes: [
      'Hand-finished natural stone base',
      'Certificate of authenticity & artisan signature',
      'Padded crate shipping, insured',
    ],
    story_tabs: [
      { label: 'Story & Craft', body: 'Every idol begins as an uncut block of natural shadu clay — nothing is cast or moulded. Each piece is hand-shaped and finished by hand, following techniques passed down through generations of artisans.' },
      { label: 'Materials & Care', body: 'Natural shadu clay, water-soluble colours only. Dissolves cleanly for eco-friendly visarjan. Keep away from direct sun and moisture before use to preserve the finish.' },
      { label: 'Shipping & Returns', body: 'Advance orders recommended, especially before Ganesh Chaturthi. Doorstep delivery. Reply on WhatsApp for the fastest response on order status or changes.' },
    ],
    template: 'storefront',
    palette: 'warm',
    font: 'inter',
    design_mode: 'craft',
    palette_tokens: {
      accent: '#7A3B12', accentSurface: '#F0E4CE', accentBorder: '#E8DFCF',
      accentGlow: '#7A3B1240', signature: '#7A3B12',
      ink: '#2A2320', inkMuted: '#6B5D4E',
    },
    signature_color: '#7A3B12',
    page_bg: '#FAF6EF',
    surface: '#FFFFFF',
    border_color: '#E8DFCF',
    display_font: 'var(--font-newsreader), Newsreader, Georgia, serif',
    body_font: 'var(--font-inter), Inter, system-ui, sans-serif',
    radius_card: '2px',
    radius_btn: '2px',
    gallery: [],
    show_sections: { hero: true, services: true, highlights: true, booking: true, faq: true, contact: true },
    sections: [
      { sectionKey: 'hero', variant: 'pdp', order: 1 },
      { sectionKey: 'facts', variant: 'strip', order: 2 },
      { sectionKey: 'services', variant: 'collection', order: 3 },
      { sectionKey: 'bio', variant: 'story', order: 4 },
      { sectionKey: 'faq', variant: 'accordion', order: 5 },
      { sectionKey: 'contact', variant: 'enquiry', order: 6 },
    ],
  }

  // Explicit select-then-insert/update rather than .upsert({onConflict:'provider_id'}) —
  // this repo's own inngest/build-page.ts upserts to `pages` with NO onConflict
  // key at all (defaults to the primary key), which means provider_id may not
  // actually carry a unique constraint on this table. Checking first is slower
  // but never guesses at schema this script doesn't control.
  const { data: existingPage } = await supabaseAdmin
    .from('pages')
    .select('provider_id')
    .eq('provider_id', provider.id)
    .maybeSingle()

  const { error: pageError } = existingPage
    ? await supabaseAdmin.from('pages').update(pageRow).eq('provider_id', provider.id)
    : await supabaseAdmin.from('pages').insert(pageRow)

  if (pageError) {
    console.error('Failed to seed ganesh test pages row:', pageError)
    process.exit(1)
  }

  console.log(`Seeded pages row for provider_id=${provider.id}`)
}

async function main() {
  await seedSalonProvider()
  await seedGaneshProvider()
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
