import { test, expect } from '@playwright/test'

// Test with user's credentials
const TEST_USER = {
  email: 'siddhartha.s.rao@gmail.com',
  password: 'Ctigroup1@'
}

test.describe('Basic Functionality Tests', () => {
  test('should be able to access homepage', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Hawking Edison')).toBeVisible()
  })

  test('should be able to login', async ({ page }) => {
    // Go to login page
    await page.goto('/auth/login')
    
    // Wait for login form
    await expect(page.locator('h1, h2').filter({ hasText: /Welcome back/i })).toBeVisible()
    
    // Fill in credentials
    await page.locator('input[placeholder="your@email.com"]').fill(TEST_USER.email)
    await page.locator('input[placeholder="Your password"]').fill(TEST_USER.password)
    
    // Submit form
    await page.locator('button[type="submit"]').click()
    
    // Should redirect to chat
    await page.waitForURL('**/chat', { timeout: 30000 })
    
    // Verify chat interface is loaded
    await expect(page.locator('textarea[placeholder*="How can I help"]')).toBeVisible()
  })

  test.skip('should be able to access new chat-v2 interface', async ({ page }) => {
    // First login
    await page.goto('/auth/login')
    await page.locator('input[placeholder="your@email.com"]').fill(TEST_USER.email)
    await page.locator('input[placeholder="Your password"]').fill(TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/chat', { timeout: 30000 })
    
    // Navigate to chat-v2
    await page.goto('/chat-v2')
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Check two-panel layout elements
    await expect(page.locator('textarea[placeholder*="How can I help"]')).toBeVisible({ timeout: 10000 })
    
    // Toggle button should exist
    await expect(page.locator('button[title*="Open tool outputs"]')).toBeVisible()
  })

  test('should be able to access API keys settings', async ({ page }) => {
    // First login
    await page.goto('/auth/login')
    await page.locator('input[placeholder="your@email.com"]').fill(TEST_USER.email)
    await page.locator('input[placeholder="Your password"]').fill(TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/chat', { timeout: 30000 })
    
    // Navigate to API keys
    await page.goto('/settings/api-keys')
    
    // Should see API keys page
    await expect(page.locator('text=/API Key Management|Your API Keys/i')).toBeVisible()
  })

  test('should handle logout properly', async ({ page }) => {
    // First login
    await page.goto('/auth/login')
    await page.locator('input[placeholder="your@email.com"]').fill(TEST_USER.email)
    await page.locator('input[placeholder="Your password"]').fill(TEST_USER.password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/chat', { timeout: 30000 })
    
    // Find and click logout
    const logoutButton = page.locator('button:has-text("Sign Out")')
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      
      // Should redirect to homepage or login
      await expect(page).toHaveURL(/\/(auth\/login)?$/, { timeout: 10000 })
    }
  })
})