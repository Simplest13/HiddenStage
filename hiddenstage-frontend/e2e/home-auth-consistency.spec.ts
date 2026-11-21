import { expect, test } from '@playwright/test'
import { register, shot, unique } from './helpers'

const SESSION = 'hs_sessionid'

test.describe('home button login state consistency', () => {
  test('customer clicks hidden stage logo to reach common homepage and returns to dashboard with session intact', async ({ page }) => {
    test.setTimeout(90_000)
    const email = unique('home_customer')
    const customerName = 'QA Home Customer'

    // 1. Register customer
    await register(page, { email, name: customerName, type: 'CUSTOMER' })
    await expect(page).toHaveURL(/\/onboarding\/customer/, { timeout: 25000 })

    // Complete onboarding
    await page.getByLabel('PIN code').fill('560001')
    await page.getByLabel('Locality').fill('MG Road')
    await page.getByLabel('City').fill('Bengaluru')
    await page.getByLabel('State').fill('Karnataka')
    await page.getByRole('button', { name: 'Complete profile' }).click()
    await expect(page).toHaveURL(/\/app$/, { timeout: 25000 })
    await expect(page.getByRole('heading', { name: /welcome back/i }).first()).toBeVisible({ timeout: 20000 })

    // Verify session cookie exists
    const session = (await page.context().cookies()).find((c) => c.name === SESSION)
    expect(session, 'session cookie must be present').toBeTruthy()

    // 2. Click Brand logo from workspace sidebar - navigates to common homepage (/)
    const sidebarHomeLink = page.getByLabel('HiddenStage home').first()
    await expect(sidebarHomeLink).toBeVisible()
    await sidebarHomeLink.click()
    await expect(page).toHaveURL(/\/$/)

    // 3. On public homepage, header and hero reflect authenticated state via PFP account profile icon
    const pfpIcon = page.locator('.account-pfp-link').first()
    const signOutBtn = page.getByRole('button', { name: 'Sign out' }).first()
    const loginLink = page.getByRole('link', { name: /^Log in$/i })
    const listBusinessLink = page.getByRole('link', { name: /List your business/i })

    await expect(pfpIcon).toBeVisible({ timeout: 15000 })
    await expect(signOutBtn).toBeVisible({ timeout: 15000 })
    await expect(loginLink).toHaveCount(0)
    await expect(listBusinessLink).toHaveCount(0)

    // 4. Clicking Brand logo on public home page stays on homepage with authenticated state
    const publicHomeLogo = page.getByLabel('HiddenStage home').first()
    await publicHomeLogo.click()
    await expect(page).toHaveURL(/\/$/)
    await expect(pfpIcon).toBeVisible()
    await expect(loginLink).toHaveCount(0)

    // 5. Click PFP account profile icon to return to customer dashboard
    await pfpIcon.click()
    await expect(page).toHaveURL(/\/app$/, { timeout: 20000 })
    await expect(page.getByRole('heading', { name: /welcome back/i }).first()).toBeVisible({ timeout: 20000 })

    // 6. Return to home and sign out
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Sign out' }).first()).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'Sign out' }).first().click()

    // After sign out, header displays anonymous links
    await expect(page.getByRole('link', { name: /^Log in$/i }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('link', { name: /List your business/i }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.account-pfp-link')).toHaveCount(0)

    await shot(page, 'home-auth-consistency-passed')
  })

  test('provider clicks hidden stage logo to reach common homepage and returns to provider dashboard with session intact', async ({ page }) => {
    test.setTimeout(90_000)
    const email = unique('home_provider')
    const providerName = 'QA Audio Productions'

    // 1. Register and onboard provider
    await register(page, { email, name: providerName, type: 'PROVIDER' })
    await page.goto('/onboarding/provider')
    await expect(page).toHaveURL('/onboarding/provider', { timeout: 25000 })

    await page.getByLabel('Professional or business name').fill(providerName)
    await page.getByLabel('How you work').selectOption('MANAGER')
    await page.getByLabel('Short description').fill('Full production, audio and lighting agency for events.')
    await page.getByLabel('Contact phone or email').fill('provider@test.example')
    await page.locator('fieldset.provider-onboarding__categories input[type="checkbox"]').first().check()
    await page.getByLabel('PIN code').fill('560001')
    await page.getByLabel('Locality').fill('MG Road')
    await page.getByLabel('City').fill('Bengaluru')
    await page.getByLabel('State').fill('Karnataka')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).toHaveURL(/\/app\/provider/, { timeout: 35000 })

    // 2. Click Brand logo from provider workspace sidebar - navigates to common homepage (/)
    const sidebarHomeLink = page.getByLabel('HiddenStage home').first()
    await expect(sidebarHomeLink).toBeVisible()
    await sidebarHomeLink.click()
    await expect(page).toHaveURL(/\/$/)

    // 3. On public homepage, verify session is active via PFP icon for provider
    const pfpIcon = page.locator('.account-pfp-link').first()
    await expect(pfpIcon).toBeVisible({ timeout: 15000 })

    // 4. Click PFP account profile icon to return to provider dashboard
    await pfpIcon.click()
    await expect(page).toHaveURL(/\/app\/provider/, { timeout: 20000 })
  })
})
