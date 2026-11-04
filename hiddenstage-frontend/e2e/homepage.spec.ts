import { expect, test } from '@playwright/test'

test('homepage presents the public discovery journey', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: /make room for something special/i })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  await expect(page.getByRole('link', { name: /explore services/i }).first()).toBeVisible()
})

test('mobile navigation opens and reaches a public route', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open menu' }).click()
  const navigation = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(navigation.getByRole('link', { name: 'How it works' })).toBeVisible()
  await navigation.getByRole('link', { name: 'How it works' }).click()
  await expect(page.getByRole('heading', { name: /from first thought to a day/i })).toBeVisible()
})

test('service location filters categories and links to matching demo providers', async ({ page }) => {
  await page.goto('/services')
  await page.getByLabel('Location').fill('Pune')
  await expect(page.getByRole('heading', { name: 'Food & drink' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Spaces' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Explore demo providers' }).click()
  await expect(page).toHaveURL(/providers\?category=food-and-drink&location=Pune/)
  await expect(page.getByRole('heading', { name: 'The Small Feast (demo)' })).toBeVisible()
})

test('contact form validates input and does not claim to send it', async ({ page }) => {
  await page.goto('/contact')
  await page.getByLabel('Your name').fill('Taylor Guest')
  await page.getByLabel('Email address').fill('taylor@example.com')
  await page.getByLabel('How can we help?').fill('I would like to learn about the preview.')
  await page.getByRole('button', { name: 'Validate message' }).click()
  await expect(page.getByRole('status')).toContainText('Your message has not been sent')
})
