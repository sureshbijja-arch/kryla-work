/**
 * scripts/seed-e2e-provider.mjs
 *
 * Idempotently seeds a deterministic test-salon provider + one pending booking, so
 * Playwright's authenticated project (see playwright.config.ts) has a known account to log
 * into via app/api/test/login/route.ts, and Task 8's e2e test has a pending booking to Accept.
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

async function main() {
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

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
