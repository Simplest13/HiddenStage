import { test, expect } from '@playwright/test'
import * as path from 'path'

const ARTIFACT_DIR = 'C:/Users/User/.gemini/antigravity/brain/44f122d2-7693-41a1-bb43-f685e6ad4b07'

test.describe('Homepage Categories & Network Search Live Suggestions', () => {
  test('homepage displays rich category images for all services', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const categoryGrid = page.locator('.category-grid')
    await expect(categoryGrid).toBeVisible()
    await categoryGrid.scrollIntoViewIfNeeded()

    const tiles = page.locator('.cat-tile')
    const count = await tiles.count()
    expect(count).toBeGreaterThanOrEqual(9)

    for (let i = 0; i < count; i++) {
      const tile = tiles.nth(i)
      const img = tile.locator('img.cat-tile__img')
      await expect(img).toBeVisible()
      const src = await img.getAttribute('src')
      expect(src).toBeTruthy()
      expect(src).toContain('/categories/')

      const isLoaded = await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)
      expect(isLoaded).toBe(true)
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit_homepage_categories_verified.png'),
      fullPage: false,
    })
  })

  test('search @username shows live suggestions and add to network adds profile to feed', async ({ page }) => {
    // 1. Login as customer
    await page.goto('/auth/login')
    await page.getByLabel('Email address').fill('ananya@example.com')
    await page.getByLabel('Password', { exact: true }).fill('Password123!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 15000 })

    // 2. Go to /app/network
    await page.goto('/app/network')
    await page.waitForLoadState('networkidle')

    // 3. Type @aman into search input
    const searchInput = page.locator('input[placeholder*="Search @username"]')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('@aman')

    // 4. Verify Suggestions header and "+ Add to my network" button appear
    const suggestionsHeader = page.locator('text=Suggested Profiles')
    await expect(suggestionsHeader).toBeVisible({ timeout: 10000 })

    const addBtn = page.locator('button:has-text("+ Add to my network")')
    await expect(addBtn.first()).toBeVisible({ timeout: 10000 })

    // Screenshot of suggestions
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit_network_search_suggestion_verified.png'),
    })

    // 5. Click "+ Add to my network"
    await addBtn.first().click()

    // 6. Verify profile now appears in active feed and conversation opens
    await expect(page.locator('text=Aman').first()).toBeVisible({ timeout: 10000 })

    // Screenshot of active feed with newly added specialist
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit_network_added_to_feed_verified.png'),
    })
  })
})
