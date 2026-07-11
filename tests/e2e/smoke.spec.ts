/**
 * Smoke tests — non-destructive UI checks against the running app.
 *
 * IMPORTANT: Never submit the onboarding form (step 4 → "Build my presence →").
 * That would create real provider rows in the DB.
 *
 * In CI these run against PLAYWRIGHT_BASE_URL (https://kryla.work).
 * Locally, the dev server is started automatically if PLAYWRIGHT_BASE_URL is unset.
 */

import { test, expect } from '@playwright/test'

test.describe('home page', () => {
  test('renders with pricing section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('YOUR MEMBERSHIP')).toBeVisible()
    await expect(
      page.getByText('Invite-only. Built for serious professionals', { exact: false })
    ).toBeVisible()
  })
})

test.describe('join page', () => {
  test('renders invite gate with disabled button', async ({ page }) => {
    await page.goto('/join')
    await expect(page.getByRole('heading', { name: 'Enter your invite code' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Verify code/ })).toBeDisabled()
  })

  test('button stays disabled for codes shorter than 5 chars', async ({ page }) => {
    await page.goto('/join')
    await page.getByPlaceholder('e.g. LUCKY').fill('XXXX')
    await expect(page.getByRole('button', { name: /Verify code/ })).toBeDisabled()
  })

  test('fake 5-char code is rejected by the API', async ({ page }) => {
    await page.goto('/join')
    const submitBtn = page.getByRole('button', { name: /Verify code/ })
    await page.getByPlaceholder('e.g. LUCKY').fill('XXXXX')
    await expect(submitBtn).toBeEnabled()
    await submitBtn.click()
    // API returns: "Code not found — check and try again"
    await expect(page.getByText('Code not found', { exact: false })).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('login page', () => {
  test('renders OTP email form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send code' })).toBeVisible()
  })
})

test.describe('onboarding', () => {
  test('step 1 shows persona grid', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page.getByRole('heading', { name: 'What do you do?' })).toBeVisible()
    // At least one persona button should be present in the 3-column grid
    await expect(page.locator('div.grid-cols-3 button').first()).toBeVisible()
  })

  test('step 3 email field has no optional label and correct helper text', async ({ page }) => {
    await page.goto('/onboarding')

    // Step 1 → pick first persona and proceed
    await page.locator('div.grid-cols-3 button').first().click()
    await page.getByRole('button', { name: 'Continue →' }).click()

    // Step 2 → fill required fields and proceed
    // IMPORTANT: we fill but do NOT click "Build my presence →" (that's step 4)
    await page.getByPlaceholder('Priya').fill('Smoke')
    await page.getByPlaceholder('e.g. Math tutoring', { exact: false }).fill('Test service description')
    await page.getByRole('button', { name: 'Continue →' }).click()

    // Step 3 — "Claim your spot"
    await expect(page.getByRole('heading', { name: 'Claim your spot' })).toBeVisible()

    // Email label should say "Your email" with no "optional" qualifier
    const emailLabel = page.locator('label', { hasText: 'Your email' })
    await expect(emailLabel).toBeVisible()
    await expect(emailLabel).not.toContainText('optional')

    // Helper text must include "log in and manage"
    await expect(page.getByText('log in and manage', { exact: false })).toBeVisible()
  })
})
