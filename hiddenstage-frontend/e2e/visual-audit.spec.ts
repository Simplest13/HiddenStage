import { expect, test } from '@playwright/test'
import { completeProviderOnboarding, register, shot, unique } from './helpers'

test.describe('Visual Audit — Full Site & Feature Capture', () => {
  test.setTimeout(180_000)

  test('captures public pages and guest flows', async ({ page }) => {
    // 1. Homepage
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-01-home')

    // 2. Services Catalog
    await page.goto('/services')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-02-services')

    // 3. Service Detail
    await page.goto('/services/photography')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-03-service-detail')

    // 4. Providers Directory
    await page.goto('/providers')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-04-providers')

    // 5. Public Provider Profile
    await page.goto('/providers/demo-01')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-05-provider-profile')

    // 6. How it works
    await page.goto('/how-it-works')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-06-how-it-works')

    // 7. For professionals
    await page.goto('/for-professionals')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-07-for-professionals')

    // 8. Login
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-08-login')

    // 9. Register
    await page.goto('/auth/register')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-09-register')
  })

  test('captures customer workspace features', async ({ page }) => {
    const email = unique('audit_cust')
    await register(page, { email, name: 'Ananya Sharma', type: 'CUSTOMER' })
    await shot(page, 'audit-10-customer-onboarding')

    // Complete onboarding
    await page.getByLabel('PIN code').fill('560001')
    await page.getByLabel('Locality').fill('Indiranagar')
    await page.getByLabel('City').fill('Bengaluru')
    await page.getByLabel('State').fill('Karnataka')
    await page.getByRole('button', { name: 'Complete profile' }).click()
    await expect(page).toHaveURL(/\/app$/, { timeout: 20000 })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.stat-grid')).toBeVisible({ timeout: 20000 })
    await shot(page, 'audit-11-customer-dashboard')

    // Event Creation Wizard
    await page.goto('/app/events/new')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-12-event-wizard')

    // Customer Quotes
    await page.goto('/app/quotes')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-13-customer-quotes')

    // Customer Commitments
    await page.goto('/app/commitments')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-14-customer-commitments')

    // Customer Profile
    await page.goto('/app/profile')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-15-customer-profile')
  })

  test('captures provider workspace features', async ({ page }) => {
    const email = unique('audit_prov')
    const providerName = 'The Royal Heritage Events'
    await register(page, { email, name: providerName, type: 'PROVIDER' })
    await page.goto('/onboarding/provider')
    await shot(page, 'audit-16-provider-onboarding')

    await completeProviderOnboarding(page, {
      name: providerName,
      kind: 'MANAGER',
      description: 'Luxury wedding planning, decor, sound and full production agency.',
      contact: 'hello@royalheritage.example',
      pin: '560001',
      locality: 'Lavelle Road',
      city: 'Bengaluru',
      state: 'Karnataka',
    })

    await expect(page).toHaveURL(/\/app\/provider/, { timeout: 30000 })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.stat-grid')).toBeVisible({ timeout: 20000 })
    await shot(page, 'audit-17-provider-dashboard')

    // Provider Profile & Portfolio Editor
    await page.goto('/app/provider/profile')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-18-provider-profile-editor')

    // Provider Network
    await page.goto('/app/provider/network')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-19-provider-network')

    // Provider Quotes
    await page.goto('/app/provider/quotes')
    await page.waitForLoadState('networkidle')
    await shot(page, 'audit-20-provider-quotes')
  })
})
