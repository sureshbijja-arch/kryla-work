/**
 * Salon bookings: accept-with-duration -> Today day-view e2e coverage.
 *
 * Runs under the `authenticated` Playwright project (see playwright.config.ts) — that
 * project's `testMatch: /\.auth\.spec\.ts/` is exactly why this file is named
 * `booking-dayview.auth.spec.ts` rather than plain `booking-dayview.spec.ts`: only the
 * `.auth.spec.ts` suffix opts a spec into the `authenticated` project's storageState
 * (tests/e2e/.auth/test-provider.json), which is produced by running the `setup` project
 * (tests/e2e/auth.setup.ts) first. This file never calls /login or the test-login route
 * itself — auth is entirely the fixture's job.
 *
 * NOTE: because Playwright's default testMatch (**\/*.@(spec|test).?(c|m)[jt]s?(x)) also
 * matches `*.auth.spec.ts`, the plain `chromium` project (no testMatch override) will ALSO
 * pick this file up and run it unauthenticated, where it will fail at the first `page.goto`
 * (middleware redirects to /login). This is a pre-existing gap in the Task 7.5 fixture, not
 * something introduced here — always run this file with `--project=authenticated` (see the
 * exact command in this repo's task-8-report.md) rather than a bare `npx playwright test`.
 *
 * Requires (same seed as the `setup` project):
 *   scripts/seed-e2e-provider.mjs run once against the target Supabase project — seeds the
 *   deterministic provider at slug `e2e-test-salon` (persona: salon, page_live: true) with
 *   one pending booking (customer: "Playwright Test Customer", service: "Haircut").
 */
import { test, expect } from '@playwright/test'

test.describe('Salon bookings day-view', () => {
  test('accepting a booking with a duration shows it on Today', async ({ page, baseURL }) => {
    // The setup project already logged in and confirmed /{slug}/mykryla is reachable
    // (see auth.setup.ts) — re-derive the same slug here rather than hardcoding a second
    // copy of it, since e2e-test-salon is the one slug app/api/test/login can ever produce.
    const slug = 'e2e-test-salon'

    await page.goto(`${baseURL ?? ''}/${slug}/mykryla`)
    await expect(page).not.toHaveURL(/\/login/)

    // Home -> My Services tile (app/mychat/tileTheme.ts: TILE_THEME.services.label).
    // No `exact: true` here: MyChatHome.tsx's TileCard renders an emoji span + title <p> +
    // features <p> all inside one <button>, so the accessible name is the concatenation of
    // all three ("🧰 My Services Services & pricing · Messages · Schedule") — a substring
    // match against the title is what actually matches, and it's unambiguous since no other
    // tile on Home is titled "My Services".
    await page.getByRole('button', { name: 'My Services' }).click()

    // Card list -> Consultations (app/mychat/SpaceClient.tsx getTileDetailCards: 'services'
    // tile's 'consultations' card; rendered as a button by app/mychat/DetailCardList.tsx).
    // No `exact: true`: DetailCardList.tsx's DetailCard likewise wraps an icon + title <p> +
    // description <p> in one <button> (accessible name includes the 📅 icon and "Booking
    // requests" description text) — substring match on the title, unique within this card list.
    await page.getByRole('button', { name: 'Consultations' }).click()

    // Accept the seeded pending booking (app/mychat/BookingsTab.tsx: "Accept" button opens
    // the inline date/time/duration picker; startAccept() defaults acceptDate to the
    // booking's preferred_date, which the seed script sets to *tomorrow* — override it to
    // today's date so the accepted booking actually lands on the Today day-view, which only
    // shows bookings whose start_at falls on the current calendar day).
    await page.getByRole('button', { name: 'Accept', exact: true }).first().click()

    const todayStr = new Date().toISOString().slice(0, 10)
    await page.locator('input[type="date"]').fill(todayStr)
    await page.locator('input[type="time"]').fill('14:00')
    await page.locator('select').selectOption('60')

    await page.getByRole('button', { name: 'Confirm time & accept' }).click()

    // Confirm the booking flipped to Accepted before navigating away. Scoped to the status
    // badge (a <span>, not a <button>) because the filter-tab row above it also has a
    // button literally labelled "Accepted" (app/mychat/BookingsTab.tsx filter tabs) — a
    // bare getByText('Accepted') would match both and violate Playwright strict mode.
    await expect(page.locator('span', { hasText: 'Accepted' }).first()).toBeVisible()

    // Back to the Services card list (HomeBackPill inside the tile-detail body is labeled
    // with the tile's title, "My Services" — see SpaceClient.tsx `tileTitle` /
    // TileDetailShell — not "Consultations" as an earlier draft of this flow assumed).
    await page.getByRole('button', { name: 'My Services', exact: true }).click()

    // Open Today (app/mychat/SpaceClient.tsx getTileDetailCards: 'services' tile's
    // 'dayview' card, gated to salon/makeup personas — the seeded provider is persona
    // 'salon' so this card is present).
    // No `exact: true`: same DetailCard multi-text-node button as above — accessible name
    // includes the 📆 icon and "Today's appointment timeline" description; substring match
    // on "Today" is unique within this card list.
    await page.getByRole('button', { name: 'Today' }).click()

    // The accepted booking should now appear in the day-view timeline
    // (app/mychat/BookingsDayView.tsx renders "N appointment(s) today" plus a card per
    // booking showing customer_name and service).
    await expect(page.getByText(/appointment(s)? today/)).toBeVisible()
    await expect(page.getByText('Playwright Test Customer')).toBeVisible()
    await expect(page.getByText('Haircut')).toBeVisible()
  })
})
