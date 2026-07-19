/**
 * Playwright setup project — logs in as the seeded e2e test provider via the test-only
 * app/api/test/login route and saves the resulting storageState for the `authenticated`
 * project to reuse (see playwright.config.ts).
 *
 * Requires (same values the login route itself checks against):
 *   E2E_TEST_AUTH_SECRET     — sent as the x-e2e-test-secret header
 *   E2E_TEST_PROVIDER_EMAIL  — the seeded test provider's email (run scripts/seed-e2e-provider.mjs
 *                               once against the target Supabase project before this can pass)
 *
 * If either env var is unset, this setup fails loudly rather than silently producing an
 * unauthenticated storageState — an authenticated test run should never silently degrade to
 * "not actually logged in."
 */
import { test as setup, expect } from '@playwright/test'

const AUTH_FILE = 'tests/e2e/.auth/test-provider.json'

setup('authenticate as e2e test provider', async ({ page, baseURL }) => {
  const secret = process.env.E2E_TEST_AUTH_SECRET
  const email = process.env.E2E_TEST_PROVIDER_EMAIL

  if (!secret) {
    throw new Error('E2E_TEST_AUTH_SECRET is not set — cannot authenticate for e2e tests.')
  }
  if (!email) {
    throw new Error('E2E_TEST_PROVIDER_EMAIL is not set — cannot authenticate for e2e tests.')
  }

  // Use page.request (shares the browser context's cookie jar), not the standalone `request`
  // fixture (a separate APIRequestContext) — otherwise the Set-Cookie response from the login
  // route lands in a cookie jar page.goto() never reads from, and every navigation below would
  // look unauthenticated even though the route itself succeeded.
  const response = await page.request.post('/api/test/login', {
    headers: { 'x-e2e-test-secret': secret },
    data: { email },
  })

  expect(
    response.ok(),
    `test-login route returned ${response.status()} — is E2E_TEST_AUTH_SECRET set on the ` +
      `server, NODE_ENV non-production, and has scripts/seed-e2e-provider.mjs been run?`
  ).toBeTruthy()

  const { slug } = await response.json() as { slug: string }

  // Visit the authenticated area to confirm the session cookies actually work end-to-end
  // before saving storageState — catches a false-positive 200 from the login route.
  await page.goto(`${baseURL ?? ''}/${slug}/mykryla`)
  await expect(page).not.toHaveURL(/\/login/)

  await page.context().storageState({ path: AUTH_FILE })
})
