import { test, expect, Page } from '@playwright/test'
import * as fs from 'fs'
import { join } from 'path'

// Load dedicated test user
const testUserPath = join(process.cwd(), '.test-user.json')
const TEST_USER = JSON.parse(fs.readFileSync(testUserPath, 'utf-8'))

// Helper to login test user
async function loginAsTestUser(page: Page) {
  // Login with existing test user
  await page.goto('/auth/login')
  await page.fill('input[placeholder="your@email.com"]', TEST_USER.email)
  await page.fill('input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/chat', { timeout: 20000 })
}

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })

  test('displays welcome message when no messages', async ({ page }) => {
    // Should show welcome message
    await expect(page.locator('text="What can I help you with today?"')).toBeVisible()
  })

  test('sidebar shows new chat button', async ({ page }) => {
    // Check sidebar elements
    await expect(page.locator('button:has-text("New chat")')).toBeVisible()
    await expect(page.locator('text="Recents"')).toBeVisible()
  })

  test('can send a message', async ({ page }) => {
    // Type a message
    const testMessage = 'Hello, this is a test message'
    await page.fill('textarea[placeholder="How can I help you today?"]', testMessage)
    
    // Send message
    await page.click('button[type="submit"]')
    
    // Check message appears
    await expect(page.locator(`text="${testMessage}"`)).toBeVisible()
    
    // Check loading indicator appears
    await expect(page.locator('.animate-bounce').first()).toBeVisible()
    
    // Wait for response (with timeout)
    await expect(page.locator('.animate-bounce').first()).not.toBeVisible({ timeout: 30000 })
  })

  test('new chat button clears messages', async ({ page }) => {
    // Send a message first
    const testMessage = 'Test message before new chat'
    await page.fill('textarea[placeholder="How can I help you today?"]', testMessage)
    await page.click('button[type="submit"]')
    await expect(page.locator(`text="${testMessage}"`)).toBeVisible()
    
    // Click new chat
    await page.click('button:has-text("New chat")')
    
    // Messages should be cleared and welcome message shown again
    await expect(page.locator(`text="${testMessage}"`)).not.toBeVisible()
    await expect(page.locator('text="What can I help you with today?"')).toBeVisible()
  })

  test('enter key sends message', async ({ page }) => {
    // Type a message
    const testMessage = 'Testing enter key'
    await page.fill('textarea[placeholder="How can I help you today?"]', testMessage)
    
    // Press Enter
    await page.press('textarea[placeholder="How can I help you today?"]', 'Enter')
    
    // Check message was sent
    await expect(page.locator(`text="${testMessage}"`)).toBeVisible()
  })

  test('shift+enter creates new line', async ({ page }) => {
    // Type a message with shift+enter
    await page.fill('textarea[placeholder="How can I help you today?"]', 'Line 1')
    await page.press('textarea[placeholder="How can I help you today?"]', 'Shift+Enter')
    await page.type('textarea[placeholder="How can I help you today?"]', 'Line 2')
    
    // Check textarea still has focus and contains both lines
    const textareaValue = await page.inputValue('textarea[placeholder="How can I help you today?"]')
    expect(textareaValue).toContain('Line 1')
    expect(textareaValue).toContain('Line 2')
  })

  test('displays user email in sidebar', async ({ page }) => {
    // Check email is displayed in sidebar
    await expect(page.locator(`text="${TEST_USER.email}"`)).toBeVisible()
  })

  test('settings link in sidebar navigates correctly', async ({ page }) => {
    // Click settings link
    await page.click('a:has-text("Settings")')
    
    // Should navigate to settings page
    await page.waitForURL('**/settings/api-keys')
    await expect(page.locator('text="API Keys"')).toBeVisible()
  })
})