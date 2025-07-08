import { test, expect } from '@playwright/test'

test.describe('Basic Production Tests', () => {
  test('can load login page', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Very simple check - just make sure we get a successful response (200 or 304)
    const response = await page.goto('/auth/login')
    const status = response?.status() || 0
    expect([200, 304].includes(status)).toBeTruthy()
    
    // Check for any heading
    const heading = await page.locator('h1, h2, h3').first()
    await expect(heading).toBeVisible({ timeout: 30000 })
  })
  
  test('has login form elements', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('domcontentloaded')
    
    // Check for form inputs
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]')
    await expect(emailInput).toBeVisible({ timeout: 10000 })
    
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible({ timeout: 10000 })
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign")')
    await expect(submitButton).toBeVisible({ timeout: 10000 })
  })
})