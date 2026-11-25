import { test, expect } from '@playwright/test'
import * as path from 'path'

const ARTIFACT_DIR = 'C:/Users/User/.gemini/antigravity/brain/44f122d2-7693-41a1-bb43-f685e6ad4b07'

test.describe('Official Logo and Consistent Greeting Verification', () => {
  test('dark mode uses the supplied dark logo while light mode keeps the existing logo', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('hiddenstage-theme', 'light'))
    await page.reload()

    await expect(page.locator('.site-header .brand__logo')).toHaveAttribute('src', '/logo.png')

    await page.evaluate(() => localStorage.setItem('hiddenstage-theme', 'dark'))
    await page.reload()

    await expect(page.locator('.site-header .brand__logo')).toHaveAttribute('src', '/logo-dark.png')
    await expect(page.locator('.site-footer .brand__logo')).toHaveAttribute('src', '/logo-dark.png')
  })

  test('public site renders the high quality logo in header and footer', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const brandLogo = page.locator('.site-header .brand__logo')
    await expect(brandLogo).toBeVisible()
    const src = await brandLogo.getAttribute('src')
    expect(src).toBe('/logo.png')

    const isLoaded = await brandLogo.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)
    expect(isLoaded).toBe(true)

    // Footer brand inverse logo
    const footerLogo = page.locator('.site-footer .brand__logo')
    if (await footerLogo.count() > 0) {
      await expect(footerLogo).toBeVisible()
      const footerSrc = await footerLogo.getAttribute('src')
      expect(footerSrc).toBe('/logo-inverse.png')
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit_logo_public_header.png'),
      fullPage: false,
    })
  })

  test('provider workspace shows inverse logo and stable greeting to Aman', async ({ page }) => {
    // 1. Login as Aman
    await page.goto('/auth/login')
    await page.getByLabel('Email address').fill('amana@gmail.com')
    await page.getByLabel('Password', { exact: true }).fill('Password123!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 15000 })

    // 2. Go to /app/provider (dashboard)
    await page.goto('/app/provider')
    await page.waitForLoadState('networkidle')

    // 3. Verify sidebar logo is inverse
    const sidebarLogo = page.locator('.workspace-sidebar__brand .brand__logo')
    await expect(sidebarLogo).toBeVisible()
    const sidebarSrc = await sidebarLogo.getAttribute('src')
    expect(sidebarSrc).toBe('/logo-inverse.png')

    // 4. Verify Welcome greeting greets Aman, NOT 'professional'
    const heading = page.locator('.dashboard-welcome-hero h1')
    await expect(heading).toBeVisible()
    const headingText = await heading.textContent()
    console.log('Provider Dashboard Heading Text:', headingText)

    expect(headingText).toContain('Welcome back, Aman.')
    expect(headingText).not.toContain('Welcome back, professional.')
    expect(headingText).toContain('Coordinate accepted bookings with your team.')

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit_provider_overview_logo_and_greeting.png'),
    })
  })
})
