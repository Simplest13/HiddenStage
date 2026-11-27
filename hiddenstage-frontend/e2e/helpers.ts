import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'Qa!7pVn2Lm4x'
export const ARTIFACTS = 'e2e-artifacts'

/** Unique-per-run suffix so repeated local runs never collide on email. */
export const unique = (tag: string) => `${tag}.${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}@example.test`

export async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${ARTIFACTS}/${name}.png`, fullPage: true })
}

export async function register(
  page: Page,
  { email, name, type }: { email: string; name: string; type: 'CUSTOMER' | 'PROVIDER' },
) {
  await page.goto('/auth/register')
  await page.getByLabel('Full name').fill(name)
  await page.getByLabel('I am joining as').selectOption(type)
  const usernameInput = page.getByLabel(/username/i)
  if (await usernameInput.count()) {
    const cleanUser = name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 15) + '_' + Math.floor(Math.random() * 10000)
    await usernameInput.fill(cleanUser)
    await expect(page.getByText(/is available!/i)).toBeVisible({ timeout: 10000 })
  }
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('New password').fill(PASSWORD)
  await page.getByLabel('Confirm password').fill(PASSWORD)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Create account' }).click()
  // Wait for the session before any caller navigates away from the form.
  await expect.poll(() => page.url(), { timeout: 30000 }).not.toContain('/auth/register')
}

export async function login(page: Page, email: string, password: string = PASSWORD) {
  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/(auth\/login)?$/)
}

/** Provider onboarding, used for both Managers and independent Workers. */
export async function completeProviderOnboarding(
  page: Page,
  { name, kind, description, pin, locality, city, state, contact }:
    { name: string; kind: 'MANAGER' | 'WORKER'; description: string; pin: string; locality: string; city: string; state: string; contact: string },
) {
  await page.goto('/onboarding/provider')
  await expect(page).toHaveURL('/onboarding/provider', { timeout: 25000 })

  // Wait for loading state to finish
  await expect(page.getByText('Loading your onboarding…')).toHaveCount(0, { timeout: 25000 })

  // Check if we are on the multi-step onboarding wizard
  const isWizard = (await page.getByRole('heading', { name: /Build your HiddenStage profile/i }).count()) > 0
  if (isWizard) {
    // Step 0: Identity
    const kindRadio = page.getByRole('radio', { name: new RegExp(kind === 'MANAGER' ? 'Manager' : 'Worker', 'i') })
    if (await kindRadio.count()) await kindRadio.first().check()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    // Step 1: Profile
    await page.getByLabel('Professional or business name').fill(name)
    const introBox = page.getByLabel(/Professional introduction|Short description/i)
    await introBox.fill(description.length >= 25 ? description : `${description} professional services for events.`)
    await page.getByLabel('Contact phone or email').fill(contact)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    // Step 2: Business / Categories
    if (kind === 'WORKER') {
      const workerRoleCheck = page.locator('.role-choice--compact input[type="checkbox"]').first()
      if (await workerRoleCheck.count()) await workerRoleCheck.check()
    }
    // Match the category used by publishEventRequest so the manager is eligible for that request.
    const catFieldset = page.locator('fieldset.provider-onboarding__categories')
    const photoCat = catFieldset.getByRole('checkbox', { name: /photograph/i }).first()
    const catCheck = (await photoCat.count())
      ? photoCat
      : catFieldset.locator('input[type="checkbox"]').first()
    if (await catCheck.count()) await catCheck.check()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    // Step 3: Coverage
    await page.getByLabel('PIN code').first().fill(pin)
    await page.getByLabel('Locality').first().fill(locality)
    await page.getByLabel('City').first().fill(city)
    await page.getByLabel('State').first().fill(state)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    // Step 4: Review & Finish
    const finishBtn = page.getByRole('button', { name: 'Complete onboarding', exact: true })
    await finishBtn.click()
    await expect(page).toHaveURL(/\/app\/provider/, { timeout: 35000 })
    return
  }

  // Fallback for single-page form
  await page.getByLabel('Professional or business name').fill(name)
  await page.getByLabel('How you work').selectOption(kind)
  await page.getByLabel('Short description').fill(description)
  await page.getByLabel('Contact phone or email').fill(contact)
  const photo = page.getByRole('checkbox', { name: /photograph/i })
  const firstCategory = page.locator('fieldset.provider-onboarding__categories input[type="checkbox"]').first()
  if (await photo.count()) await photo.first().check()
  else if (await firstCategory.count()) await firstCategory.check()
  const pinBox = page.getByLabel('PIN code')
  if (await pinBox.count()) {
    await pinBox.first().fill(pin)
    await page.getByLabel('Locality').first().fill(locality)
    await page.getByLabel('City').first().fill(city)
    await page.getByLabel('State').first().fill(state)
  }
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL(/\/app\/provider/, { timeout: 30000 })
}

/** New customers land on onboarding first; the workspace opens after this. */
export async function completeCustomerOnboarding(page: Page) {
  await expect(page).toHaveURL(/\/onboarding\/customer/, { timeout: 25000 })
  await page.getByLabel('PIN code').fill('560001')
  await page.getByLabel('Locality').fill('MG Road')
  await page.getByLabel('City').fill('Bengaluru')
  await page.getByLabel('State').fill('Karnataka')
  await page.getByRole('button', { name: 'Complete profile' }).click()
  await expect(page).toHaveURL(/\/app$/, { timeout: 25000 })
}

export async function registerCustomer(page: Page, email: string, name = 'QA Customer') {
  await register(page, { email, name, type: 'CUSTOMER' })
  await completeCustomerOnboarding(page)
}

/** Fill an input or choose an option without hard-coding which widget it is. */
export async function setField(page: Page, label: string, value: string) {
  const locator = page.getByLabel(label, { exact: true }).first()
  await expect(locator).toBeVisible()
  const tag = await locator.evaluate((el) => el.tagName)
  if (tag === 'SELECT') await locator.selectOption({ index: 1 })
  else await locator.fill(value)
}

/** Creates and publishes a request through the real request wizard. Returns its id. */
export async function publishEventRequest(page: Page, name = 'QA Terrace supper') {
  await page.goto('/app/events/new')
  await expect(page).toHaveURL(/\/app\/events\/new/, { timeout: 25000 })
  await setField(page, 'Request name', name)
  await setField(page, 'Type of event', 'Private dinner')
  await setField(page, 'Guest count', '24')
  await page.getByLabel('Event start date').fill('2030-04-18')
  await page.getByLabel('Start time').fill('18:30')
  await page.getByLabel('End time').fill('22:30')
  await page.getByRole('button', { name: 'Continue' }).click()

  await setField(page, 'PIN code', '560001')
  await setField(page, 'Locality or area', 'MG Road')
  await setField(page, 'City', 'Bengaluru')
  await setField(page, 'State', 'Karnataka')
  await page.getByRole('button', { name: 'Continue' }).click()

  const categorySelect = page.getByLabel('Service category', { exact: true }).first()
  await expect(categorySelect).toBeVisible()
  const photographyValue = await categorySelect.evaluate((el) => {
    const options = Array.from((el as HTMLSelectElement).options)
    const match = options.find((option) => /photograph/i.test(option.textContent || ''))
    return match ? match.value : options[1]?.value ?? ''
  })
  await categorySelect.selectOption(photographyValue)
  await page.getByLabel('Short title').fill('Two-hour coverage')
  await page.getByLabel('What do you need?').fill('Document the evening and share edited frames.')
  await page.getByLabel('Budget in ₹ (optional)').fill('8000')
  await page.getByRole('button', { name: 'Add service' }).click()
  await expect(page.getByText(/1 service added/i)).toBeVisible({ timeout: 20000 })
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByRole('button', { name: 'Publish request' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 20000 })
  await dialog.getByRole('button', { name: 'Publish request' }).click()
  await expect(page).toHaveURL(/\/app\/events\/[0-9a-f-]{36}/, { timeout: 30000 })
  return page.url().split('/').pop() as string
}

/** Fills a field only when the page actually renders it. */
export async function optionalFill(page: Page, label: string, value: string) {
  const locator = page.getByLabel(label, { exact: true }).first()
  if (await locator.count()) await locator.fill(value)
}

/** Starts (or resumes) a quotation, prices the first open requirement and submits it. */
export async function submitQuotation(
  page: Page,
  { title, price, included, message }: { title: string; price: string; included: string; message: string },
) {
  const lineTitle = page.getByLabel('Line title')
  const startQuote = page.getByRole('button', { name: 'Start quotation' })
  await expect(lineTitle.or(startQuote).first()).toBeVisible({ timeout: 30000 })

  if (await startQuote.isVisible().catch(() => false)) {
    await startQuote.first().click()
    // Creating the draft reloads the editor; filling before that lands resets the items.
    await expect(page.getByText(/Draft revision d|New quotation/)).toBeVisible({ timeout: 20000 })
    await expect(startQuote).toHaveCount(0, { timeout: 20000 })
  }

  const requirement = page.locator('.quote-editor__items input[type="checkbox"]').first()
  await expect(requirement).toBeVisible({ timeout: 30000 })
  if (!(await requirement.isChecked())) await requirement.check()
  await expect(lineTitle).toBeVisible({ timeout: 20000 })

  await lineTitle.fill(title)
  await page.getByLabel('Price in ₹').fill(price)
  await optionalFill(page, 'What is included', included)
  await optionalFill(page, 'Message to the organiser', message)

  // The total is the UI's own view of the quote state: prove the price landed.
  const expectedTotal = Number(price).toLocaleString('en-IN')
  const total = page.locator('.quote-editor__total')
  if (!(await total.innerText()).includes(expectedTotal)) {
    await page.getByLabel('Price in ₹').fill(price)
  }
  await expect(total).toContainText(expectedTotal, { timeout: 20000 })

  await page.getByRole('button', { name: 'Submit quotation' }).click()
  await expect(page.getByText('is with the organiser')).toBeVisible({ timeout: 30000 })
}
