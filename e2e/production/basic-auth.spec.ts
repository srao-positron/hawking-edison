import { test, expect } from '@playwright/test'

test.describe('Basic Auth Tests', () => {
  test.skip('home page loads', async ({ page }) => {
    await page.goto('/')
    
    // Wait for client-side redirect and login page to appear
    await expect(page.locator('text=Welcome back!')).toBeVisible({ timeout: 30000 })
    
    // Check page title
    await expect(page).toHaveTitle(/Hawking Edison/)
  })

  test('can navigate to login page', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Check login page elements
    await expect(page.locator('text=Welcome back!')).toBeVisible()
    await expect(page.locator('input[placeholder="your@email.com"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Sign in')
  })

  test('can navigate to signup page', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Check signup page elements
    await expect(page.locator('text=Create your account')).toBeVisible()
    await expect(page.locator('input[placeholder="your@email.com"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Create account')
  })

  test('shows error on invalid login', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Wait for form to be ready
    await page.waitForLoadState('networkidle')
    
    // Try to login with invalid credentials
    await page.fill('input[placeholder="your@email.com"]', 'invalid@hawkingedison.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error notification
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 })
  })
})