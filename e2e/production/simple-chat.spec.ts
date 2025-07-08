import { test, expect } from '@playwright/test'
import { getTestUser } from '../test-user-helper'

// Load dedicated test user
const TEST_USER = getTestUser()

test.describe('Production Chat Tests', () => {
  test('can login and send message', async ({ page }) => {
    // Navigate to login
    await page.goto('/auth/login')
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    // Login
    await page.fill('input[placeholder="your@email.com"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    
    // Wait for redirect to chat
    await page.waitForURL('**/chat', { timeout: 30000 })
    
    // Wait for chat interface to be ready
    await expect(page.locator('text="What can I help you with today?"')).toBeVisible({ timeout: 20000 })
    
    // Send a message
    const testMessage = 'Hello from production test'
    await page.fill('textarea[placeholder="How can I help you today?"]', testMessage)
    await page.click('button[type="submit"]')
    
    // Verify message appears
    await expect(page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 10000 })
    
    // Wait for response (either loading or actual response)
    // Don't check for pendingRequests - just wait for visible changes
    const responseAppeared = await page.waitForSelector(
      '.animate-bounce, .bg-white.border.border-gray-200', 
      { timeout: 20000 }
    ).catch(() => null)
    
    expect(responseAppeared).toBeTruthy()
  })
})