import { test, expect } from '@playwright/test'

test.describe('Basic Auth Tests', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    
    // Home page redirects to login when not authenticated
    await page.waitForURL('**/auth/login', { timeout: 10000 })
    
    // Check if we're on the login page
    await expect(page).toHaveTitle(/Hawking Edison/)
    await expect(page.locator('text=Welcome back!')).toBeVisible()
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
    await page.fill('input[placeholder="your@email.com"]', 'invalid@hawkingedison.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error notification
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 })
  })
})