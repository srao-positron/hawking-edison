import { test, expect } from '@playwright/test'

test.describe('Minimal Production Tests', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Just check that we have a login form
    await expect(page.locator('form')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('input[type="email"], input[placeholder*="email" i]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })
  
  test('can navigate to signup', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Find the signup link - use a more flexible selector
    const signupLink = page.locator('a').filter({ hasText: /sign up/i }).first()
    await expect(signupLink).toBeVisible({ timeout: 10000 })
    
    await signupLink.click()
    
    // Should be on signup page
    await expect(page.url()).toContain('/auth/signup')
  })
})