import { expect, test } from '@playwright/test'

// This journey only applies when the backend runs with the verification gate on.
const verificationRequired = process.env.E2E_EMAIL_VERIFICATION_REQUIRED === '1'

test('signed-out visitors are sent to sign in from the workspace', async ({ page }) => {
  await page.goto('/app')
  await expect(page).toHaveURL(/\/auth\/login/)
  await expect(page.getByRole('heading', { name: 'Sign in to HiddenStage' })).toBeVisible()
})

test('a new customer is asked to verify their email when the policy requires it', async ({ page }) => {
  test.skip(
    !verificationRequired,
    'Backend is running with EMAIL_VERIFICATION_REQUIRED=0. Start Django with =1 and set E2E_EMAIL_VERIFICATION_REQUIRED=1 to run this journey.',
  )
  const email = `e2e-${Date.now()}@example.test`
  await page.goto('/auth/register')
  await page.getByLabel('Full name').fill('E2E Organiser')
  await page.getByLabel('I am joining as').selectOption('CUSTOMER')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Mobile number (optional)').fill('9876543210')
  await page.getByLabel('New password').fill('Preview123!')
  await page.getByLabel('Confirm password').fill('Preview123!')
  await page.locator('input[name="terms"]').check()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/auth\/verify-email/)
  await expect(page.getByRole('heading', { name: 'Verify your email address' })).toBeVisible()
})

test('registration checks that the passwords match before submitting', async ({ page }) => {
  await page.goto('/auth/register')
  await page.getByLabel('Full name').fill('E2E Organiser')
  await page.getByLabel('Email address').fill(`e2e-${Date.now()}@example.test`)
  await page.getByLabel('Mobile number (optional)').fill('9876543210')
  await page.getByLabel('New password').fill('Preview123!')
  await page.getByLabel('Confirm password').fill('Different123!')
  await page.locator('input[name="terms"]').check()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Passwords do not match')).toBeVisible()
  await expect(page).toHaveURL(/\/auth\/register/)
})
