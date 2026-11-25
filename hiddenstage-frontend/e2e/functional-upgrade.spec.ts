import { test, expect } from '@playwright/test'
import { register, registerCustomer, unique } from './helpers'

test.describe('HiddenStage Functional Upgrade E2E Suite', () => {
  test('Test B: Multi-day event creation and date validation', async ({ page }) => {
    const customerEmail = unique('multiday.customer')
    await registerCustomer(page, customerEmail, 'Anita MultiDay')

    await page.goto('/app/events/new')
    await expect(page.getByRole('heading', { name: /Let’s shape your event plan/i })).toBeVisible({ timeout: 15000 })

    // 1. Basic Details
    await page.getByLabel('Request name').fill('Grand Multi-Day Festival')
    await page.getByLabel('Type of event').selectOption('Festival')
    await page.getByLabel('Guest count').fill('250')

    // Start Date: e.g. 2027-05-10
    await page.getByLabel('Event start date').fill('2027-05-10')

    // Test Quick Duration: 3 Days -> should set endDate to 2027-05-12
    await page.getByRole('button', { name: '3 Days' }).click()
    await expect(page.getByLabel('Event end date')).toHaveValue('2027-05-12')
    await expect(page.getByText(/Multi-day event — from/i)).toBeVisible()

    // Test Invalid End Date: end date before start date
    await page.getByLabel('Event end date').fill('2027-05-08')
    await page.getByLabel('Start time').fill('10:00')
    await page.getByLabel('End time').fill('18:00')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText('The end date cannot be before the start date.')).toBeVisible()

    // Fix end date with 2 Days duration
    await page.getByRole('button', { name: '2 Days' }).click()
    await expect(page.getByLabel('Event end date')).toHaveValue('2027-05-11')

    // Continue to Location
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText('Where is it happening?')).toBeVisible()
  })

  test('Test D: Custom service requirement with Other and custom fields', async ({ page }) => {
    const customerEmail = unique('customservice.customer')
    await registerCustomer(page, customerEmail, 'Vikram Custom')

    await page.goto('/app/events/new')
    await expect(page.getByRole('heading', { name: /Let’s shape your event plan/i })).toBeVisible({ timeout: 15000 })

    // Step 0: Essentials
    await page.getByLabel('Request name').fill('Drone Light Show Night')
    await page.getByLabel('Type of event').selectOption('Corporate event')
    await page.getByLabel('Guest count').fill('150')
    await page.getByLabel('Event start date').fill('2027-06-20')
    await page.getByLabel('Start time').fill('19:00')
    await page.getByLabel('End time').fill('23:00')
    await page.getByRole('button', { name: 'Continue' }).click()

    // Step 1: Location
    await page.getByLabel('PIN code').fill('560001')
    await page.getByLabel('Locality or area').fill('MG Road')
    await page.getByLabel('City').fill('Bengaluru')
    await page.getByLabel('State').fill('Karnataka')
    await page.getByRole('button', { name: 'Continue' }).click()

    // Step 2: Services
    await expect(page.getByRole('heading', { name: 'What do you need?' })).toBeVisible()

    // Choose category 'Other'
    await page.getByLabel('Service category').selectOption('other')

    // Custom service fields appear
    await expect(page.getByLabel('Custom service name')).toBeVisible()
    await page.getByLabel('Custom service name').fill('Synchronized Drone Formation')
    await page.getByLabel('Custom service details').fill('100 synchronized drones forming logos in sky')
    await page.getByLabel('Short title').fill('Aerial Drone Display')
    await page.getByLabel('What do you need?').fill('Night display for 15 minutes')
    await page.getByLabel('Budget in ₹ (optional)').fill('150000')

    await page.getByRole('button', { name: 'Add service' }).click()

    // Verified badge displays Other: Synchronized Drone Formation
    await expect(page.getByText('Other: Synchronized Drone Formation')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Aerial Drone Display' })).toBeVisible()
  })

  test('Test E: 5-role professional onboarding and Individual SP 1-category rule', async ({ page }) => {
    const providerEmail = unique('indiv.sp')
    await register(page, { email: providerEmail, name: 'Siddharth Solo', type: 'PROVIDER' })

    await expect(page).toHaveURL('/onboarding/provider', { timeout: 20000 })
    await expect(page.getByRole('heading', { name: 'Introduce your work.' })).toBeVisible()

    await page.getByLabel('Professional or business name').fill('Siddharth Photography')

    // Select INDIVIDUAL_SERVICE_PROVIDER
    await page.getByLabel('How you work').selectOption('INDIVIDUAL_SERVICE_PROVIDER')

    // Notice 1-category rule banner
    await expect(page.getByText(/Individual Service Providers specialize in exactly one primary category/i)).toBeVisible()

    // Select Photography category
    const photographyRadio = page.locator('input[type="radio"][name="primaryCategory"]').first()
    await photographyRadio.check()
    await expect(photographyRadio).toBeChecked()

    // Fill bio & contact
    await page.getByLabel('Short description').fill('Professional solo wedding and event photographer with 8 years experience in South India.')
    await page.getByLabel('Contact phone or email').fill('9876543210')

    // Fill coverage
    await page.getByLabel('PIN code').fill('560001')
    await page.getByLabel('Locality').fill('Central')
    await page.getByLabel('City').fill('Bengaluru')
    await page.getByLabel('State').fill('Karnataka')

    await page.getByRole('button', { name: 'Save and continue' }).click()

    // Navigates to provider workspace with comfortable timeout for cloud DB
    await expect(page).toHaveURL(/\/app\/provider/, { timeout: 30000 })
  })

  test('Test F: Profile & Portfolio Management Upgrade', async ({ page }) => {
    const managerEmail = unique('portfolio.mgr')
    await register(page, { email: managerEmail, name: 'Rajesh Manager', type: 'PROVIDER' })

    await page.goto('/onboarding/provider')
    await expect(page).toHaveURL('/onboarding/provider', { timeout: 20000 })
    await page.getByLabel('Professional or business name').fill('Royal Occasions Management')
    await page.getByLabel('How you work').selectOption('MANAGER')
    await page.getByLabel('Short description').fill('Full-scale wedding and celebration production agency based in Bengaluru.')
    await page.getByLabel('Contact phone or email').fill('rajesh@royaloccasions.test')

    // Pick a category
    await page.locator('fieldset.provider-onboarding__categories input[type="checkbox"]').first().check()

    // Coverage
    await page.getByLabel('PIN code').fill('560025')
    await page.getByLabel('Locality').fill('Richmond Town')
    await page.getByLabel('City').fill('Bengaluru')
    await page.getByLabel('State').fill('Karnataka')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).toHaveURL(/\/app\/provider/, { timeout: 30000 })

    // Go to Profile & Portfolio page
    await page.goto('/app/provider/profile')
    await expect(page.getByRole('heading', { name: /Professional Profile & Portfolio/i })).toBeVisible({ timeout: 20000 })

    // Wait for profile to load
    await expect(page.getByText(/Profile completed/i)).toBeVisible({ timeout: 25000 })

    // Switch to Portfolio tab
    await page.getByRole('button', { name: 'Portfolio & Showcase' }).click()
    await expect(page.getByText(/Work Showcase/i)).toBeVisible({ timeout: 20000 })

    // Add portfolio showcase item
    await page.getByRole('button', { name: '+ Add showcase item' }).click()
    await page.getByLabel('Title').fill('Lakeside Sunset Wedding 2026')
    await page.getByLabel('Media Type').selectOption('VIDEO')
    await page.getByLabel('External URL').fill('https://youtube.com/watch?v=demo1234')
    await page.getByLabel('Description').fill('Complete sound, lighting, and decor for 300 guests.')
    await page.getByRole('button', { name: 'Add Item' }).click()

    // Item appears in showcase list
    await expect(page.getByText('Lakeside Sunset Wedding 2026')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('View Link')).toBeVisible()

    // Switch to Team & Delegation tab
    await page.getByRole('button', { name: 'Team & Delegation' }).click()
    await expect(page.getByText(/Team & Assistant Delegation/i)).toBeVisible()
    await expect(page.getByRole('button', { name: '+ Add Team Assistant' })).toBeVisible()
  })
})
