import { test, expect } from '@playwright/test'

test.describe('Basic Auth Tests', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    
    // Check if page loads at all
    await expect(page).toHaveTitle(/Hawking Edison/)
    
    // Look for main heading
    const heading = page.locator('h1')
    await expect(heading).toContainText('Hawking Edison')
  })

  test('can navigate to login page', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Check login page elements
    await expect(page.locator('text=Welcome back!')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Sign in')
  })

  test('can navigate to signup page', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Check signup page elements
    await expect(page.locator('text=Create your account')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Create account')
  })

  test('shows error on invalid login', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Try to login with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error
    await expect(page.locator('.mantine-Alert-root')).toBeVisible({ timeout: 10000 })
  })
})