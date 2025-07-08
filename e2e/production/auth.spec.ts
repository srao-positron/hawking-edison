import { test, expect, Page } from '@playwright/test'
import { getTestUser } from '../test-user-helper'

// Load dedicated test user
const TEST_USER = getTestUser()

// Create unverified test user for testing
const UNVERIFIED_USER = {
  email: `sid+he-testing-unverified-${Date.now()}@hawkingedison.com`,
  password: 'TestPassword123!'
}

// Create invalid user for testing
const INVALID_USER = {
  email: 'invalid@hawkingedison.com',
  password: 'WrongPassword123!'
}

test.describe('Authentication Flow', () => {
  test.skip('home page redirects to login', async ({ page }) => {
    await page.goto('/')
    
    // Wait for client-side redirect to complete
    // The page should either show login form or redirect to /auth/login
    await expect(page.locator('h1:has-text("Welcome back!")')).toBeVisible({ timeout: 30000 })
    
    // Verify we have login form elements
    await expect(page.locator('input[placeholder="your@email.com"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test.skip('can navigate to signup', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Click signup link - use more specific selector
    const signupLink = page.locator('a:has-text("Don\'t have an account? Sign up")').first()
    await signupLink.click()
    
    // Should navigate to signup page
    await expect(page.locator('h1:has-text("Create your account")')).toBeVisible({ timeout: 10000 })
  })

  test.skip('signup flow with email verification', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Fill signup form
    await page.fill('input[placeholder="your@email.com"]', UNVERIFIED_USER.email)
    await page.fill('input[type="password"]', UNVERIFIED_USER.password)
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should show success message about email verification
    await expect(page.locator('text="Check your email"')).toBeVisible({ timeout: 10000 })
  })

  test('login with valid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Wait for login form to be ready
    await page.waitForLoadState('networkidle')
    
    // Fill login form with test user
    await page.fill('input[placeholder="your@email.com"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    
    // Submit form and wait for navigation
    await page.click('button[type="submit"]')
    
    // Should navigate to chat page
    await expect(page.locator('text="What can I help you with today?"')).toBeVisible({ timeout: 30000 })
  })

  test('login with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Wait for login form
    await page.waitForLoadState('networkidle')
    
    // Fill login form with invalid credentials
    await page.fill('input[placeholder="your@email.com"]', INVALID_USER.email)
    await page.fill('input[type="password"]', INVALID_USER.password)
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should show error message - use first() for strict mode
    await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 10000 })
    
    // Should stay on login page
    const url = page.url()
    expect(url).toContain('/auth/login')
  })

  test('login with unverified email', async ({ page }) => {
    // First, try to create an unverified user
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    
    await page.fill('input[placeholder="your@email.com"]', UNVERIFIED_USER.email)
    await page.fill('input[type="password"]', UNVERIFIED_USER.password)
    await page.click('button[type="submit"]')
    
    // Wait for signup response
    await page.waitForTimeout(3000)
    
    // Go to login page
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Try to login with unverified email
    await page.fill('input[placeholder="your@email.com"]', UNVERIFIED_USER.email)
    await page.fill('input[type="password"]', UNVERIFIED_USER.password)
    await page.click('button[type="submit"]')
    
    // Should show error about email confirmation - use first() for strict mode
    await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 10000 })
  })

  test.skip('password reset flow', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Click forgot password link
    await page.click('text="Forgot password?"')
    
    // Should navigate to reset password page
    await page.waitForURL('**/auth/forgot-password')
    
    // Fill reset form
    await page.fill('input[placeholder="your@email.com"]', TEST_USER.email)
    await page.click('button[type="submit"]')
    
    // Should show success message
    await expect(page.locator('text="Check your email"')).toBeVisible({ timeout: 10000 })
  })

  test.skip('signup password validation', async ({ page }) => {
    await page.goto('/auth/signup')
    await page.waitForLoadState('networkidle')
    
    // Try weak password
    await page.fill('input[placeholder="your@email.com"]', 'test@hawkingedison.com')
    await page.fill('input[type="password"]', '123')
    
    // Tab out or click elsewhere to trigger validation
    await page.click('body')
    
    // Password error should appear
    await expect(page.locator('text=/[Pp]assword.*must.*/')).toBeVisible({ timeout: 5000 })
  })

  test.skip('navigation between auth pages', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Navigate to signup - use more specific selector
    const signupNav = page.locator('a:has-text("Don\'t have an account? Sign up")').first()
    await signupNav.click()
    await expect(page.locator('h1:has-text("Create your account")')).toBeVisible({ timeout: 10000 })
    
    // Navigate back to login - use more specific selector
    const loginNav = page.locator('a:has-text("Already have an account? Sign in")').first()
    await loginNav.click()
    await expect(page.locator('h1:has-text("Welcome back!")')).toBeVisible({ timeout: 10000 })
  })

  test.skip('protected route redirect', async ({ page }) => {
    // Try to access protected route without login
    await page.goto('/chat')
    
    // Should show login page elements (client-side redirect)
    await expect(page.locator('h1:has-text("Welcome back!")')).toBeVisible({ timeout: 30000 })
  })
})