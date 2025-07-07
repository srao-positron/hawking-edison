import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('/')

  // Home page redirects to login, but title should still be correct
  await expect(page).toHaveTitle(/Hawking Edison/)
})

test('auth redirect flow', async ({ page }) => {
  await page.goto('/')

  // Home page should redirect to login when not authenticated
  await page.waitForURL('**/auth/login', { timeout: 10000 })
  
  // Verify we're on the login page
  await expect(page.locator('text=Welcome back!')).toBeVisible()
})