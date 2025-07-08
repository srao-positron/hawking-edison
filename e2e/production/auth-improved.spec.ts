import { test, expect } from '@playwright/test'
import { getTestUser } from '../test-user-helper'
import { loginUser, waitForAuthReady } from '../helpers/login-helper'

// Load dedicated test user
const TEST_USER = getTestUser()

// Create invalid user for testing  
const INVALID_USER = {
  email: 'invalid@hawkingedison.com',
  password: 'WrongPassword123!'
}

test.describe('Authentication Flow (Improved)', () => {
  test('home page redirects to login', async ({ page }) => {
    await page.goto('/')
    
    // Wait for client-side redirect to complete
    await waitForAuthReady(page)
    
    // Should be on login page
    await expect(page.locator('h1').filter({ hasText: 'Welcome back!' })).toBeVisible({ 
      timeout: 30000 
    })
    
    // Verify we have login form elements
    await expect(page.locator('input[placeholder="your@email.com"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('login with valid credentials', async ({ page }) => {
    // Use improved login helper
    await loginUser(page, TEST_USER.email, TEST_USER.password)
    
    // Should navigate to chat page
    await expect(page.locator('text="What can I help you with today?"')).toBeVisible({ 
      timeout: 30000 
    })
  })

  test('login with invalid credentials', async ({ page }) => {
    // Use improved login helper
    await loginUser(page, INVALID_USER.email, INVALID_USER.password)
    
    // Should show error message
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 })
    
    // Should stay on login page
    const url = page.url()
    expect(url).toContain('/auth/login')
  })

  test('protected route redirect', async ({ page }) => {
    // Try to access protected route without login
    await page.goto('/chat')
    
    // Wait for redirect
    await waitForAuthReady(page)
    
    // Should show login page
    await expect(page.locator('h1').filter({ hasText: 'Welcome back!' })).toBeVisible({ 
      timeout: 30000 
    })
  })
})