import { expect, test } from '@playwright/test'
import { publishEventRequest, registerCustomer, shot, unique } from './helpers'

test.describe('customer journey', () => {
  test('browses the public site, registers, and publishes an event request', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 25000 })
    await shot(page, 'cust-01-home')

    await page.goto('/services')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 25000 })
    await shot(page, 'cust-02-services')

    await page.goto('/providers')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 25000 })
    await shot(page, 'cust-03-providers')

    await registerCustomer(page, unique('journey'), 'QA Journey')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 25000 })
    await shot(page, 'cust-04-dashboard')

    await publishEventRequest(page)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 25000 })
    await shot(page, 'cust-05-request-detail')

    await page.getByRole('link', { name: 'Event requests' }).click()
    await expect(page.getByText('QA Terrace supper').first()).toBeVisible({ timeout: 25000 })
    await shot(page, 'cust-06-requests-list')
  })
})
