import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// Load test user credentials
const testUserPath = path.join(process.cwd(), '.test-user.json')
const TEST_USER = JSON.parse(fs.readFileSync(testUserPath, 'utf-8'))

// Helper to login
async function loginAsTestUser(page: any) {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  
  // Wait for login form
  await expect(
    page.locator('h1, h2').filter({ hasText: /Welcome back/i }).first()
  ).toBeVisible({ timeout: 20000 })
  
  // Fill login form
  await page.locator('input[type="email"]').fill(TEST_USER.email)
  await page.locator('input[type="password"]').fill(TEST_USER.password)
  
  // Submit
  await page.locator('button[type="submit"], button:has-text("Sign in")').click()
  
  // Wait for redirect to chat
  await page.waitForURL('**/chat-v2', { timeout: 20000 })
  await page.waitForLoadState('networkidle')
}

test.describe('Realtime Chat Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })

  test('should show two-panel layout with collapsible right panel', async ({ page }) => {
    // Check main chat interface is visible
    await expect(page.locator('textarea[placeholder*="How can I help"]')).toBeVisible()
    
    // Right panel should be hidden by default
    await expect(page.getByText('Tool Outputs & Visualizations')).not.toBeVisible()
    
    // Click toggle button to open right panel
    await page.locator('button[title*="Open tool outputs"]').click()
    
    // Right panel should now be visible
    await expect(page.getByText('Tool Outputs & Visualizations')).toBeVisible()
    
    // Click close button
    await page.locator('button[title="Close panel"]').click()
    
    // Right panel should be hidden again
    await expect(page.getByText('Tool Outputs & Visualizations')).not.toBeVisible()
  })

  test('should stream responses using SSE', async ({ page }) => {
    // Type a message
    const testMessage = 'Hello, can you help me understand streaming?'
    await page.locator('textarea[placeholder*="How can I help"]').fill(testMessage)
    
    // Send message
    await page.locator('button[type="submit"]').click()
    
    // Check user message appears
    await expect(page.locator('text=' + testMessage)).toBeVisible()
    
    // Check loading indicator appears
    await expect(page.locator('.animate-bounce').first()).toBeVisible()
    
    // Wait for streaming to complete (loading indicator disappears)
    await expect(page.locator('.animate-bounce').first()).not.toBeVisible({ timeout: 30000 })
    
    // Check assistant response appears
    const assistantMessage = page.locator('.bg-white.border-gray-200').last()
    await expect(assistantMessage).toBeVisible()
    await expect(assistantMessage).toContainText(/streaming|help/i)
  })

  test('should show thinking process during response', async ({ page }) => {
    // Send a complex message that triggers thinking
    const complexMessage = 'Can you analyze the pros and cons of different database architectures?'
    await page.locator('textarea[placeholder*="How can I help"]').fill(complexMessage)
    await page.locator('button[type="submit"]').click()
    
    // Check for thinking process indicator
    await expect(page.locator('text=Thinking Process')).toBeVisible({ timeout: 10000 })
    
    // Check for at least one thought
    await expect(page.locator('text=/Planning|Reasoning|Decision/')).toBeVisible({ timeout: 10000 })
  })

  test('should show tool outputs in right panel', async ({ page }) => {
    // Open right panel first
    await page.locator('button[title*="Open tool outputs"]').click()
    await expect(page.getByText('Tool Outputs & Visualizations')).toBeVisible()
    
    // Send a message that triggers tool use
    const toolMessage = 'Create a bar chart showing sales data for Q1'
    await page.locator('textarea[placeholder*="How can I help"]').fill(toolMessage)
    await page.locator('button[type="submit"]').click()
    
    // Wait for tool execution
    await page.waitForTimeout(3000)
    
    // Check for tool output in right panel
    const rightPanel = page.locator('[class*="bg-gray-50"]').filter({ hasText: 'Tool Outputs' })
    await expect(rightPanel.locator('text=/Tool:|Visualization:/')).toBeVisible({ timeout: 20000 })
  })

  test('should support keyboard shortcut for right panel', async ({ page, browserName }) => {
    // Skip on WebKit as keyboard shortcuts can be flaky
    if (browserName === 'webkit') {
      test.skip()
    }
    
    // Right panel should be hidden
    await expect(page.getByText('Tool Outputs & Visualizations')).not.toBeVisible()
    
    // Press Cmd/Ctrl + \ to toggle
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+\\`)
    
    // Right panel should be visible
    await expect(page.getByText('Tool Outputs & Visualizations')).toBeVisible({ timeout: 5000 })
    
    // Press again to close
    await page.keyboard.press(`${modifier}+\\`)
    
    // Right panel should be hidden
    await expect(page.getByText('Tool Outputs & Visualizations')).not.toBeVisible({ timeout: 5000 })
  })

  test('should create new threads and switch between them', async ({ page }) => {
    // Get initial thread from URL or sidebar
    const sidebar = page.locator('[class*="border-r"]').first()
    
    // Click new chat button
    await sidebar.locator('button:has-text("New Chat")').click()
    
    // Send a message in new thread
    const firstMessage = 'This is my first thread'
    await page.locator('textarea[placeholder*="How can I help"]').fill(firstMessage)
    await page.locator('button[type="submit"]').click()
    
    // Wait for response
    await expect(page.locator('.animate-bounce').first()).not.toBeVisible({ timeout: 30000 })
    
    // Create another thread
    await sidebar.locator('button:has-text("New Chat")').click()
    
    // Send a different message
    const secondMessage = 'This is my second thread'
    await page.locator('textarea[placeholder*="How can I help"]').fill(secondMessage)
    await page.locator('button[type="submit"]').click()
    
    // Wait for response
    await expect(page.locator('.animate-bounce').first()).not.toBeVisible({ timeout: 30000 })
    
    // Switch back to first thread (should be in sidebar history)
    const threadList = sidebar.locator('[role="list"], [class*="space-y"]')
    const firstThread = threadList.locator('text=' + firstMessage.substring(0, 20))
    if (await firstThread.isVisible()) {
      await firstThread.click()
      
      // Verify we're back in first thread
      await expect(page.locator('text=' + firstMessage)).toBeVisible()
      await expect(page.locator('text=' + secondMessage)).not.toBeVisible()
    }
  })

  test('should handle connection errors gracefully', async ({ page }) => {
    // Simulate offline condition
    await page.context().setOffline(true)
    
    // Try to send a message
    await page.locator('textarea[placeholder*="How can I help"]').fill('Test offline')
    await page.locator('button[type="submit"]').click()
    
    // Should show error message
    await expect(
      page.locator('text=/error|couldn\'t connect|try again/i')
    ).toBeVisible({ timeout: 10000 })
    
    // Go back online
    await page.context().setOffline(false)
    
    // Should be able to send messages again
    await page.locator('textarea[placeholder*="How can I help"]').fill('Test online')
    await page.locator('button[type="submit"]').click()
    
    // Should work normally
    await expect(page.locator('.animate-bounce').first()).toBeVisible()
  })

  test('should show agent conversations as sub-threads', async ({ page }) => {
    // Open right panel
    await page.locator('button[title*="Open tool outputs"]').click()
    
    // Send a message that creates agents
    const agentMessage = 'Can you have two experts debate the best programming language?'
    await page.locator('textarea[placeholder*="How can I help"]').fill(agentMessage)
    await page.locator('button[type="submit"]').click()
    
    // Wait for agent creation
    await page.waitForTimeout(5000)
    
    // Check for agent conversations in right panel
    const rightPanel = page.locator('[class*="bg-gray-50"]').filter({ hasText: 'Tool Outputs' })
    await expect(rightPanel.locator('text=/Agent:|Expert:/')).toBeVisible({ timeout: 20000 })
    
    // Expand an agent conversation
    const agentItem = rightPanel.locator('[class*="rounded-lg border"]').filter({ hasText: 'Agent' }).first()
    await agentItem.click()
    
    // Should show agent messages
    await expect(agentItem.locator('text=/system:|user:|assistant:/')).toBeVisible()
  })
})