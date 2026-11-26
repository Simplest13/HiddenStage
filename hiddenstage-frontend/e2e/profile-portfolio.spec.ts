import { expect, test } from '@playwright/test'
import { register, registerCustomer, completeProviderOnboarding, unique } from './helpers'

test.describe('WedMeGood Professional Profile & Portfolio Suite', () => {
  test('Complete Profile Management, WedMeGood Public Profile, Media Showcase & Direct Enquiry', async ({ page }) => {
    test.setTimeout(120_000)
    const managerEmail = unique('wedmegood.manager')
    const customerEmail = unique('wedmegood.customer')

    // 1. Register & Onboard Manager
    await register(page, { email: managerEmail, name: 'Ananya Grand Events', type: 'PROVIDER' })
    await completeProviderOnboarding(page, {
      name: 'Ananya Grand Productions',
      kind: 'MANAGER',
      description: 'Premier bespoke destination wedding and luxury event production agency based in Bangalore.',
      contact: '+91 98450 12345',
      pin: '560001',
      locality: 'MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
    })

    // 2. Open Profile Management & Verify Strength Meter
    await page.goto('/app/provider/profile')
    await expect(page.getByRole('heading', { name: /Professional Profile & Portfolio/i })).toBeVisible({ timeout: 25000 })
    await expect(page.getByText(/Profile Strength & Readiness/i)).toBeVisible({ timeout: 25000 })

    const previewLink = page.getByRole('link', { name: /Preview Public Profile/i })
    await expect(previewLink).toBeVisible({ timeout: 15000 })
    const publicProfilePath = await previewLink.getAttribute('href')
    expect(publicProfilePath).toBeTruthy()

    // 3. Test Service Coverage tab (?tab=coverage)
    await page.getByRole('button', { name: 'Service Coverage' }).click()
    await expect(page.getByText(/Service Coverage Locations/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('MG Road')).toBeVisible({ timeout: 25000 })

    // Add another coverage location
    await page.getByLabel('PIN code').fill('560034')
    await page.getByLabel('Locality / Area').fill('Koramangala')
    await page.getByLabel('City').fill('Bengaluru')
    await page.getByLabel('State').fill('Karnataka')
    await page.getByRole('button', { name: '+ Add coverage location' }).click()
    await expect(page.getByText('Koramangala')).toBeVisible({ timeout: 20000 })

    // 4. Test Services & Pricing tab
    await page.getByRole('button', { name: 'Services & Pricing' }).click()
    await expect(page.getByText(/Services & Packages/i)).toBeVisible({ timeout: 15000 })

    // 5. Test Portfolio & Showcase tab
    await page.getByRole('button', { name: 'Portfolio & Showcase' }).click()
    await expect(page.getByText(/Work Showcase/i)).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: '+ Add showcase item' }).click()
    await page.getByLabel('Title').fill('Palace Sangeet Night Gala')
    await page.getByLabel('Media Type').selectOption('VIDEO')
    await page.getByLabel('External URL').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await page.getByLabel('Description').fill('Grand stage lighting and 500-guest concert audio setup.')
    await page.getByRole('button', { name: 'Add Item' }).click()
    await expect(page.getByText('Palace Sangeet Night Gala')).toBeVisible({ timeout: 20000 })

    // 6. Navigate directly to the WedMeGood Public Profile
    await page.goto(publicProfilePath!)
    await expect(page).toHaveURL(/\/providers\//, { timeout: 25000 })

    // 7. Verify WedMeGood Structure & Sticky Tabs
    await expect(page.getByRole('heading', { name: 'Ananya Grand Productions', exact: true })).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('button', { name: 'About & Story', exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: 'Services & Pricing', exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /Photo Gallery/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /Videos/i }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /Service Coverage/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: 'Reviews', exact: true })).toBeVisible({ timeout: 15000 })

    // 8. Verify Video Showcase Embed
    await page.getByRole('button', { name: /Videos/i }).first().click()
    await expect(page.getByText('Palace Sangeet Night Gala')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('iframe[src*="youtube.com/embed"]')).toBeVisible({ timeout: 15000 })

    // 9. Verify Direct Enquiry link points to event wizard with provider parameter
    const quoteButton = page.getByRole('link', { name: /Request a Quote/i }).first()
    await expect(quoteButton).toBeVisible({ timeout: 15000 })
    const quoteUrl = await quoteButton.getAttribute('href')
    expect(quoteUrl).toContain('/app/events/new?provider=')
    expect(quoteUrl).toContain('Ananya%20Grand%20Productions')

    // 10. Switch to Customer session and verify prefilled Direct Enquiry Banner
    await page.getByRole('button', { name: 'Sign out' }).click()
    await registerCustomer(page, customerEmail, 'Divya Customer')
    await page.goto(quoteUrl!)
    await expect(page.getByRole('heading', { name: /Let’s shape your event plan/i })).toBeVisible({ timeout: 20000 })
    await expect(page.getByText(/Direct Enquiry for Ananya Grand Productions/i)).toBeVisible({ timeout: 15000 })
  })
})
