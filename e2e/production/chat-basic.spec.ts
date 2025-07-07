import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import { join } from 'path'

// Load dedicated test user
const testUserPath = join(process.cwd(), '.test-user.json')
const TEST_USER = JSON.parse(fs.readFileSync(testUserPath, 'utf-8'))

test.describe('Basic Chat Test', () => {
  test('can login and see chat interface', async ({ page }) => {
    // Go to login page
    await page.goto('/auth/login')
    
    // Debug: Take screenshot
    await page.screenshot({ path: 'test-results/login-page.png' })
    
    // Check we're on login page
    await expect(page.locator('h1:has-text("Welcome back!")')).toBeVisible()
    
    // Fill in credentials
    await page.fill('input[placeholder="your@email.com"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    
    // Submit form
    await Promise.all([
      page.waitForNavigation({ url: '**/chat', waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ])
    
    // Debug: Take screenshot after login
    await page.screenshot({ path: 'test-results/after-login.png' })
    
    // Check we made it to chat page
    expect(page.url()).toContain('/chat')
    
    // Check for chat interface elements
    await expect(page.locator('text="What can I help you with today?"')).toBeVisible({ timeout: 10000 })
  })
})