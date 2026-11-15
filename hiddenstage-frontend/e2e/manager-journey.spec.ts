import { expect, test } from '@playwright/test'
import { completeProviderOnboarding, publishEventRequest, register, registerCustomer, shot, submitQuotation, unique } from './helpers'

const EVENT_NAME = 'QA Manager Quote Event'

test('manager registers, onboards, discovers the request and submits a quotation', async ({ browser }) => {
  const customerContext = await browser.newContext()
  const customer = await customerContext.newPage()
  await registerCustomer(customer, unique('mgr-cust'), 'QA Customer')
  const eventId = await publishEventRequest(customer, EVENT_NAME)
  await customerContext.close()

  const context = await browser.newContext()
  const page = await context.newPage()
  await register(page, { email: unique('manager'), name: 'QA Manager', type: 'PROVIDER' })
  await expect(page).toHaveURL(/\/onboarding\/provider/, { timeout: 25000 })
  await completeProviderOnboarding(page, {
    name: 'QA Manager Studio',
    kind: 'MANAGER',
    description: 'We coordinate photography and production crews for private events across Bengaluru.',
    pin: '560001',
    locality: 'MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    contact: '+919812345678',
  })
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 25000 })
  await shot(page, 'mgr-01-dashboard')

  await page.goto('/app/provider/opportunities')
  await expect(page.getByText(EVENT_NAME).first()).toBeVisible({ timeout: 30000 })
  await shot(page, 'mgr-02-opportunities')

  await page.goto(`/app/provider/quotes/${eventId}`)
  await submitQuotation(page, {
    title: 'Full evening coverage',
    price: '7500',
    included: 'Two photographers, four hours, edited gallery.',
    message: 'We can cover the full evening and share frames within a week.',
  })
  await shot(page, 'mgr-03-quote-submitted')

  await page.goto('/app/provider/quotes')
  await expect(page.getByText(/7,500|7500/).first()).toBeVisible({ timeout: 25000 })
  await shot(page, 'mgr-04-quotes-list')
})
