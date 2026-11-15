import { expect, test } from '@playwright/test'
import { completeProviderOnboarding, publishEventRequest, register, registerCustomer, shot, submitQuotation, unique } from './helpers'

const EVENT_NAME = 'QA Independent Worker Event'
const WORKER_NAME = 'QA Independent Photographer'

test('independent worker registers, quotes without an invitation, and the customer accepts', async ({ browser }) => {
  const customerContext = await browser.newContext()
  const customer = await customerContext.newPage()
  await registerCustomer(customer, unique('worker-cust'), 'QA Worker Customer')
  const eventId = await publishEventRequest(customer, EVENT_NAME)

  const workerContext = await browser.newContext()
  const worker = await workerContext.newPage()
  await register(worker, { email: unique('worker'), name: 'QA Worker', type: 'PROVIDER' })
  await expect(worker).toHaveURL(/\/onboarding\/provider/, { timeout: 25000 })
  await completeProviderOnboarding(worker, {
    name: WORKER_NAME,
    kind: 'WORKER',
    description: 'Independent photographer covering private dinners and small celebrations in Bengaluru.',
    pin: '560001',
    locality: 'Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    contact: '+919812345679',
  })
  await expect(worker.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 25000 })
  await shot(worker, 'wrk-01-dashboard')

  // No invitation was sent: an independent Worker must find it in matched opportunities.
  await worker.goto('/app/provider/opportunities')
  await expect(worker.getByText(EVENT_NAME).first()).toBeVisible({ timeout: 30000 })
  await shot(worker, 'wrk-02-opportunities')

  await worker.goto(`/app/provider/quotes/${eventId}`)
  await submitQuotation(worker, {
    title: 'Independent evening coverage',
    price: '8200',
    included: 'Solo photographer, four hours, 60 edited frames.',
    message: 'I work independently and can cover the whole evening.',
  })
  await shot(worker, 'wrk-03-quote-submitted')

  await worker.goto('/app/provider/quotes')
  await expect(worker.getByText(/8,200|8200/).first()).toBeVisible({ timeout: 25000 })
  await shot(worker, 'wrk-04-quotes-list')

  // The customer compares quotations and chooses the independent Worker.
  await customer.goto(`/app/events/${eventId}/quotes`)
  await expect(customer.getByText(WORKER_NAME).first()).toBeVisible({ timeout: 30000 })
  await shot(customer, 'wrk-05-customer-comparison')

  await customer.getByRole('button', { name: 'Choose supplier' }).first().click()
  const dialog = customer.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 20000 })
  await dialog.getByRole('checkbox').first().check()
  await shot(customer, 'wrk-06-choose-supplier')
  await dialog.getByRole('button', { name: 'Confirm selection' }).click()
  await expect(dialog).toBeHidden({ timeout: 30000 })
  await expect(customer.getByText('Already committed').first()).toBeVisible({ timeout: 30000 })
  await customer.goto('/app/customer/commitments')
  await expect(customer.getByText(WORKER_NAME).first()).toBeVisible({ timeout: 25000 })
  await expect(customer.getByText(/8,200/).first()).toBeVisible({ timeout: 20000 })
  await shot(customer, 'wrk-07-commitments-list')
})
