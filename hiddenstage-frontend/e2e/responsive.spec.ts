import { expect, test, type Page } from '@playwright/test'
import { completeProviderOnboarding, publishEventRequest, register, registerCustomer, unique } from './helpers'

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
]

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, `${label} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1)
}

test.describe('responsive layouts', () => {
  test('customer pages fit 1440, 768 and 390 without horizontal overflow', async ({ page }) => {
    await registerCustomer(page, unique('resp'), 'QA Responsive')
    await publishEventRequest(page, 'QA Responsive Event')
    const eventId = page.url().split('/').pop() as string

    const routes = ['/', '/services', '/providers', '/app', '/app/events', '/app/events/new', `/app/events/${eventId}`, '/app/settings']
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      for (const route of routes) {
        await page.goto(route)
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 25000 })
        await assertNoHorizontalOverflow(page, `${route} @ ${viewport.name}`)
        const slug = route === '/' ? 'home' : route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
        await page.screenshot({ path: `e2e-artifacts/resp-${viewport.name}-${slug}.png`, fullPage: true })
      }
    }
  })

  test('provider pages fit 1440, 768 and 390 without horizontal overflow', async ({ browser }) => {
    test.setTimeout(240_000)
    const customerContext = await browser.newContext()
    const customer = await customerContext.newPage()
    await registerCustomer(customer, unique('resp-mgr-cust'), 'QA Customer')
    await publishEventRequest(customer, 'QA Responsive Provider Event')
    await customerContext.close()

    const context = await browser.newContext()
    const page = await context.newPage()
    await register(page, { email: unique('resp-mgr'), name: 'QA Responsive Manager', type: 'PROVIDER' })
    await completeProviderOnboarding(page, {
      name: 'QA Responsive Studio',
      kind: 'MANAGER',
      description: 'Responsive layout checks for manager workspaces and network screens.',
      pin: '560001',
      locality: 'MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      contact: '+919812345670',
    })

    const routes = ['/app/provider', '/app/provider/opportunities', '/app/provider/quotes', '/app/provider/network', '/app/provider/network/discover', '/app/provider/assignments', '/app/provider/profile']
    const screenshotRoutes = ['/app/provider', '/app/provider/opportunities', '/app/provider/network']
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      for (const route of routes) {
        await page.goto(route)
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 25000 })
        await assertNoHorizontalOverflow(page, `${route} @ ${viewport.name}`)
        if (screenshotRoutes.includes(route)) {
          const slug = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
          await page.screenshot({ path: `e2e-artifacts/resp-${viewport.name}-${slug}.png`, fullPage: true })
        }
      }
      await expect(page.getByRole('link', { name: 'Opportunities' })).toBeVisible()
    }
  })
})
