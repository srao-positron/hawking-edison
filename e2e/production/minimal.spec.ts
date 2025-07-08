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
    await page.waitForLoadState('networkidle')
    
    // Look for the "Create account" link specifically
    const signupLink = page.getByRole('link', { name: 'Create account' })
    await expect(signupLink).toBeVisible({ timeout: 10000 })
    
    // Click the link
    await signupLink.click()
    
    // Wait for URL to change
    await page.waitForURL('**/auth/signup', { timeout: 30000 })
    
    // Verify we're on signup page
    expect(page.url()).toContain('/auth/signup')
  })
})