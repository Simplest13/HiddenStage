import { expect, test, type Page } from '@playwright/test'

const ARTIFACT_DIR = 'e2e-artifacts/dark-theme'

async function enableDarkMode(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('hiddenstage-theme', 'dark')
    document.documentElement.setAttribute('data-theme', 'dark')
  })
}

async function loginWithRetry(page: Page, email: string, password: string, targetUrlPattern = /\/app(\/.*)?$/) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto('/auth/login')
    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    try {
      await expect(page).toHaveURL(targetUrlPattern, { timeout: 12000 })
      return
    } catch (e) {
      if (attempt === 3) throw e
      await page.waitForTimeout(1000)
    }
  }
}

async function capture(page: Page, path: string, name: string) {
  let currentPath = ''
  try {
    currentPath = new URL(page.url()).pathname
  } catch {
    currentPath = ''
  }

  if (currentPath !== path) {
    await page.goto(path)
  }

  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    localStorage.setItem('hiddenstage-theme', 'dark')
  })

  // Wait for loading spinners to detach
  await page.locator('.spinner, [role="status"]').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})

  // Wait for main content or page layout to be visible
  await page.locator('.workspace-main, .customer-page, .provider-page, .admin-page, .public-site, main').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})

  // Small delay for CSS transitions / layout paint
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${ARTIFACT_DIR}/${name}.png`, fullPage: true })
}

test.describe('Dark Theme Visual Audit — All Pages and User Roles', () => {
  test.setTimeout(240_000)

  test.beforeEach(async ({ page }) => {
    await enableDarkMode(page)
  })

  test('Public and guest pages in dark mode', async ({ page }) => {
    await capture(page, '/', '01-public-home')
    await capture(page, '/services', '02-public-services')
    await capture(page, '/services/photography', '03-public-service-detail')
    await capture(page, '/providers', '04-public-providers')
    await capture(page, '/providers/demo-01', '05-public-provider-profile')
    await capture(page, '/how-it-works', '06-public-how-it-works')
    await capture(page, '/for-professionals', '07-public-for-professionals')
    await capture(page, '/my-networks', '08-public-my-networks')
    await capture(page, '/about', '09-public-about')
    await capture(page, '/contact', '10-public-contact')
    await capture(page, '/auth/login', '11-public-login')
    await capture(page, '/auth/register', '12-public-register')
    await capture(page, '/admin/login', '13-public-admin-login')
  })

  test('Customer post-login pages in dark mode', async ({ page }) => {
    await loginWithRetry(page, 'customer@hiddenstage.in', 'Customer@HiddenStage2026')
    await page.locator('.workspace-main, .stat-grid, .customer-page').first().waitFor({ state: 'visible', timeout: 15000 })
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
      localStorage.setItem('hiddenstage-theme', 'dark')
    })

    await capture(page, '/app', '20-customer-dashboard')
    await capture(page, '/app/bookings', '21-customer-bookings')
    await capture(page, '/app/network', '22-customer-network')
    await capture(page, '/app/payments', '23-customer-payments')
    await capture(page, '/app/events/new', '24-customer-new-event')
    await capture(page, '/app/customer/quotes', '25-customer-quotes')
    await capture(page, '/app/customer/commitments', '26-customer-commitments')
    await capture(page, '/app/settings', '27-customer-settings')
  })

  test('Provider (Manager) post-login pages in dark mode', async ({ page }) => {
    await loginWithRetry(page, 'manager@hiddenstage.in', 'Manager@HiddenStage2026')
    await page.locator('.workspace-main, .provider-page').first().waitFor({ state: 'visible', timeout: 15000 })
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
      localStorage.setItem('hiddenstage-theme', 'dark')
    })

    await capture(page, '/app/provider', '30-manager-dashboard')
    await capture(page, '/app/provider/profile', '31-manager-profile')
    await capture(page, '/app/provider/services', '32-manager-services')
    await capture(page, '/app/provider/coverage', '33-manager-coverage')
    await capture(page, '/app/provider/opportunities', '34-manager-opportunities')
    await capture(page, '/app/provider/network', '35-manager-network')
    await capture(page, '/app/provider/network/discover', '36-manager-network-discover')
    await capture(page, '/app/provider/assignments', '37-manager-assignments')
    await capture(page, '/app/provider/quotes', '38-manager-quotes')
    await capture(page, '/app/provider/commitments', '39-manager-commitments')
  })

  test('Worker post-login pages in dark mode', async ({ page }) => {
    await loginWithRetry(page, 'worker@hiddenstage.in', 'Worker@HiddenStage2026')
    await page.locator('.workspace-main, .provider-page').first().waitFor({ state: 'visible', timeout: 15000 })
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
      localStorage.setItem('hiddenstage-theme', 'dark')
    })

    await capture(page, '/app/provider', '40-worker-dashboard')
    await capture(page, '/app/provider/opportunities', '41-worker-opportunities')
    await capture(page, '/app/provider/assignments', '42-worker-assignments')
  })

  test('Admin post-login pages in dark mode', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByLabel('Admin email address').fill('admin@hiddenstage.in')
    await page.getByLabel('Password', { exact: true }).fill('Admin@HiddenStage2026')
    await page.getByRole('button', { name: 'Sign In to Admin Workspace' }).click()
    await expect(page).not.toHaveURL(/\/admin\/login/, { timeout: 30000 })
    await expect(page).toHaveURL(/\/admin(\/.*)?$/, { timeout: 30000 })
    await page.locator('.workspace-main, .admin-page').first().waitFor({ state: 'visible', timeout: 20000 })
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
      localStorage.setItem('hiddenstage-theme', 'dark')
    })

    await capture(page, '/admin', '50-admin-overview')
    await capture(page, '/admin/businesses', '51-admin-businesses')
    await capture(page, '/admin/audit', '52-admin-audit')
  })
})
