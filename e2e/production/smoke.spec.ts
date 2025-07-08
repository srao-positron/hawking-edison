import { test, expect } from '@playwright/test'
import { getTestUser } from '../test-user-helper'

// Load dedicated test user
const TEST_USER = getTestUser()

test.describe('Production Smoke Tests', () => {
  test('can access login page', async ({ page }) => {
    await page.goto('/auth/login')
    await page.waitForLoadState('domcontentloaded')
    
    // Check login page loads
    const heading = page.locator('h1, h2').filter({ hasText: /Welcome back/i })
    await expect(heading.first()).toBeVisible({ timeout: 30000 })
  })

  test('can login with test user', async ({ page }) => {
    // Go to login
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Debug: Log page content if login fails
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser error:', msg.text())
      }
    })
    
    // Fill login form
    const emailInput = page.locator('input[placeholder="your@email.com"]')
    await emailInput.waitFor({ state: 'visible', timeout: 10000 })
    await emailInput.fill(TEST_USER.email)
    
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill(TEST_USER.password)
    
    // Submit
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    
    // Wait for either success or error
    const result = await Promise.race([
      page.waitForURL('**/chat', { timeout: 30000 }).then(() => 'success'),
      page.locator('[role="alert"]').first().waitFor({ state: 'visible', timeout: 5000 }).then(() => 'error')
    ]).catch(() => 'timeout')
    
    if (result === 'error') {
      const errorText = await page.locator('[role="alert"]').first().textContent()
      console.error('Login failed with error:', errorText)
      console.error('Test user email:', TEST_USER.email)
    }
    
    expect(result).toBe('success')
  })
})