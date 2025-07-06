import { test, expect } from '@playwright/test'

test.describe('Basic Auth Tests', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    
    // Check if page loads at all
    await expect(page).toHaveTitle(/Hawking Edison/)
    
    // Look for main heading - be more specific
    const heading = page.locator('h1').first()
    await expect(heading).toContainText('Hawking Edison')
  })

  test('can navigate to login page', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Check login page elements
    await expect(page.locator('text=Welcome back!')).toBeVisible()
    // Login page uses text input for email
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
    
    // Try to login with invalid credentials
    await page.fill('input[placeholder="your@email.com"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error notification
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 })
  })
})