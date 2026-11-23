import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\User\.gemini\antigravity\brain\44f122d2-7693-41a1-bb43-f685e6ad4b07"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1400, "height": 900})
        page = await context.new_page()

        # Step 1: Verify Homepage Category Images
        print("[1] Navigating to homepage...")
        await page.goto("http://localhost:5173/", wait_until="networkidle")
        await page.wait_for_selector(".category-grid")

        # Scroll into view of categories
        cat_grid = page.locator(".category-grid")
        await cat_grid.scroll_into_view_if_needed()
        await page.wait_for_timeout(1000)

        # Check all category tiles have valid images
        tiles = page.locator(".cat-tile")
        count = await tiles.count()
        print(f"Found {count} category tiles.")
        assert count >= 9, f"Expected at least 9 category tiles, got {count}"

        image_urls = []
        for i in range(count):
            tile = tiles.nth(i)
            img = tile.locator("img.cat-tile__img")
            assert await img.count() > 0, f"Tile {i} missing img.cat-tile__img"
            src = await img.get_attribute("src")
            image_urls.append(src)
            # check naturalWidth
            loaded = await img.evaluate("(el) => el.complete && el.naturalWidth > 0")
            print(f"  Tile {i}: src={src}, loaded={loaded}")
            assert loaded, f"Image {src} failed to render or load!"

        homepage_shot = os.path.join(ARTIFACT_DIR, "audit_homepage_categories.png")
        await page.screenshot(path=homepage_shot, full_page=False)
        print(f"Homepage categories screenshot saved to {homepage_shot}")

        # Step 2: Login as customer
        print("[2] Logging in as customer...")
        await page.goto("http://localhost:5173/auth/login", wait_until="networkidle")
        await page.fill('input[name="email"], input[type="email"]', "ananya@example.com")
        await page.fill('input[name="password"], input[type="password"]', "Password123!")
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(2000)

        # Step 3: Navigate to Network page
        print("[3] Navigating to Network page...")
        await page.goto("http://localhost:5173/network", wait_until="networkidle")
        await page.wait_for_timeout(1500)

        # Step 4: Search for username @aman
        print("[4] Searching for @aman...")
        search_input = page.locator('input[placeholder*="Search"]')
        await search_input.fill("@aman")
        await page.wait_for_timeout(1500)

        # Verify suggestions appear
        suggestions_header = page.locator('text=Suggested Profiles')
        await suggestions_header.wait_for(timeout=5000)
        print("Suggestions header appeared!")

        add_btn = page.locator('button:has-text("+ Add to my network")')
        await add_btn.wait_for(timeout=5000)
        print("Found '+ Add to my network' button for suggested profile.")

        suggestion_shot = os.path.join(ARTIFACT_DIR, "audit_network_search_suggestion.png")
        await page.screenshot(path=suggestion_shot)
        print(f"Search suggestion screenshot saved to {suggestion_shot}")

        # Step 5: Click '+ Add to my network'
        print("[5] Clicking '+ Add to my network'...")
        await add_btn.first.click()
        await page.wait_for_timeout(3000)

        # Verify profile is now in active network / conversations
        print("Verifying contact appears in network feed...")
        await page.wait_for_selector('text=Aman', timeout=5000)

        feed_shot = os.path.join(ARTIFACT_DIR, "audit_network_added_to_feed.png")
        await page.screenshot(path=feed_shot)
        print(f"Added to feed screenshot saved to {feed_shot}")

        await browser.close()
        print("ALL VERIFICATIONS PASSED!")

if __name__ == "__main__":
    asyncio.run(main())
