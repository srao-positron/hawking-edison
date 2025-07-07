import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('/')

  // Home page or login page should have correct title
  await expect(page).toHaveTitle(/Hawking Edison/)
})

test.skip('auth redirect flow', async ({ page }) => {
  await page.goto('/')

  // Wait for page to fully load
  await page.waitForLoadState('networkidle')
  
  // We should see login elements (either on /auth/login or home page shows login)
  await expect(page.locator('text=Welcome back!')).toBeVisible({ timeout: 15000 })
})