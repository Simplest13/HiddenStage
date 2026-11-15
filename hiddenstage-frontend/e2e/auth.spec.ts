import { expect, test } from '@playwright/test'
import { login, register, registerCustomer, shot, signOut, unique } from './helpers'

const SESSION = 'hs_sessionid'

test.describe('browser authentication', () => {
  test('customer registers, signs in without email verification, and survives a reload', async ({ page }) => {
    await register(page, { email: unique('customer'), name: 'QA Customer', type: 'CUSTOMER' })
    await expect(page).toHaveURL(/\/onboarding\/customer/, { timeout: 25000 })
    await page.getByLabel('PIN code').fill('560001')
    await page.getByLabel('Locality').fill('MG Road')
    await page.getByLabel('City').fill('Bengaluru')
    await page.getByLabel('State').fill('Karnataka')
    await page.getByRole('button', { name: 'Complete profile' }).click()
    await expect(page).toHaveURL(/\/app$/, { timeout: 25000 })
    await expect(page.getByRole('heading', { name: /welcome back/i }).first()).toBeVisible({ timeout: 20000 })

    const session = (await page.context().cookies()).find((c) => c.name === SESSION)
    expect(session, 'a session cookie must be set').toBeTruthy()
    expect(session!.httpOnly, 'session cookie is HttpOnly').toBe(true)
    expect(session!.sameSite.toLowerCase()).toBe('lax')

    await page.reload()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('heading', { name: /welcome back/i }).first()).toBeVisible({ timeout: 20000 })
    await shot(page, 'auth-01-customer-dashboard')
  })

  test('provider registration routes to professional onboarding', async ({ page }) => {
    await register(page, { email: unique('provider'), name: 'QA Manager', type: 'PROVIDER' })
    await expect(page).toHaveURL(/\/onboarding\/provider/, { timeout: 25000 })
    await expect(page.getByLabel('Professional or business name')).toBeVisible({ timeout: 20000 })
    await shot(page, 'auth-02-provider-onboarding')
  })

  test('duplicate registration is rejected with a visible message', async ({ page }) => {
    const email = unique('dupe')
    await registerCustomer(page, email)
    await signOut(page)

    await register(page, { email, name: 'QA Duplicate', type: 'CUSTOMER' })
    // The API rejects the duplicate; the message renders as a field error beside the email input.
    await expect(page.getByText(/already exists|already registered/i).first()).toBeVisible({ timeout: 25000 })
    await expect(page).toHaveURL(/\/auth\/register/)
    await shot(page, 'auth-03-duplicate-email')
  })

  test('invalid credentials are refused and leave no session', async ({ page }) => {
    const email = unique('wrongpass')
    await registerCustomer(page, email)
    await signOut(page)

    await login(page, email, 'DefinitelyWrong!123')
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 20000 })
    await expect(page).toHaveURL(/\/auth\/login/)
    expect((await page.context().cookies()).find((c) => c.name === SESSION)).toBeUndefined()
  })

  test('anonymous visitors are sent to sign in and sign out clears the session', async ({ page }) => {
    await page.goto('/app/events')
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 20000 })

    await registerCustomer(page, unique('signout'))
    await signOut(page)
    await page.goto('/app/events')
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 20000 })
    expect((await page.context().cookies()).find((c) => c.name === SESSION)).toBeUndefined()
  })
})
