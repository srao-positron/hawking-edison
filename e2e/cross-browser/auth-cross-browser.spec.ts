import { test, expect } from '@playwright/test'
import { getTestUser } from '../test-user-helper'
import { loginUser, waitForAuthReady, isLoggedIn } from '../helpers/login-helper'
import { 
  setupConsoleLogging, 
  waitForReactReady, 
  getBrowserWaitTimes,
  capturePageState,
  waitForNetworkSettled
} from '../helpers/browser-debug'

// Load dedicated test user
const TEST_USER = getTestUser()

// Invalid user for testing
const INVALID_USER = {
  email: 'invalid@hawkingedison.com',
  password: 'WrongPassword123!'
}

test.describe('Cross-Browser Authentication', () => {
  test.beforeEach(async ({ page, browserName }) => {
    // Enable console logging for debugging
    setupConsoleLogging(page)
    
    // Log browser being tested
    console.log(`\n=== Testing on ${browserName} ===`)
  })

  test('login page loads correctly', async ({ page, browserName }) => {
    const waitTimes = getBrowserWaitTimes(browserName)
    
    // Navigate to login page
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })
    
    // Wait for network to settle
    await waitForNetworkSettled(page)
    
    // Wait for React to be ready
    await waitForReactReady(page)
    
    // Capture initial state for debugging
    await capturePageState(page, 'After navigation')
    
    // Wait for auth to be ready
    await waitForAuthReady(page)
    
    // Additional browser-specific wait
    await page.waitForTimeout(waitTimes.hydration)
    
    // Verify page title
    await expect(page).toHaveTitle(/Hawking Edison/)
    
    // Try multiple strategies to find the heading
    let headingFound = false
    const headingStrategies = [
      // Strategy 1: Wait for specific h1
      async () => {
        const h1 = page.locator('h1').filter({ hasText: 'Welcome back!' })
        await expect(h1).toBeVisible({ timeout: 5000 })
        headingFound = true
      },
      // Strategy 2: Wait for any h1 and check text
      async () => {
        await page.waitForSelector('h1', { state: 'visible', timeout: 5000 })
        const h1Text = await page.locator('h1').first().textContent()
        expect(h1Text?.trim()).toBe('Welcome back!')
        headingFound = true
      },
      // Strategy 3: Use XPath
      async () => {
        await page.waitForSelector('//h1[contains(text(), "Welcome back!")]', { 
          state: 'visible', 
          timeout: 5000 
        })
        headingFound = true
      }
    ]
    
    // Try each strategy
    for (const strategy of headingStrategies) {
      if (headingFound) break
      try {
        await strategy()
      } catch (e) {
        console.log('Heading strategy failed:', e.message)
      }
    }
    
    // If heading still not found, capture state and fail with helpful message
    if (!headingFound) {
      await capturePageState(page, 'Heading not found')
      throw new Error('Could not find "Welcome back!" heading with any strategy')
    }
    
    // Verify form elements are present and visible
    const emailInput = page.locator('input[placeholder="your@email.com"]')
    const passwordInput = page.locator('input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')
    
    await expect(emailInput).toBeVisible({ timeout: 5000 })
    await expect(passwordInput).toBeVisible({ timeout: 5000 })
    await expect(submitButton).toBeVisible({ timeout: 5000 })
    
    // Verify form is interactive
    await expect(emailInput).toBeEnabled()
    await expect(passwordInput).toBeEnabled()
    await expect(submitButton).toBeEnabled()
  })

  test('can login with valid credentials', async ({ page, browserName }) => {
    // Use the robust login helper
    await loginUser(page, TEST_USER.email, TEST_USER.password)
    
    // Verify we're logged in
    expect(await isLoggedIn(page)).toBe(true)
    
    // Verify we're on the chat page
    await expect(page).toHaveURL(/.*\/chat/)
    
    // Wait for chat interface to load
    await waitForReactReady(page)
    
    // Verify chat interface elements
    await expect(page.locator('text="What can I help you with today?"')).toBeVisible({ 
      timeout: 10000 
    })
  })

  test('shows error with invalid credentials', async ({ page, browserName }) => {
    // Use the login helper with invalid credentials
    await loginUser(page, INVALID_USER.email, INVALID_USER.password)
    
    // Should still be on login page
    await expect(page).toHaveURL(/.*\/auth\/login/)
    
    // Should show error alert
    const errorAlert = page.locator('[role="alert"]')
    await expect(errorAlert).toBeVisible({ timeout: 10000 })
    
    // Verify error message content
    const errorText = await errorAlert.textContent()
    expect(errorText).toBeTruthy()
  })

  test('form validation works', async ({ page, browserName }) => {
    const waitTimes = getBrowserWaitTimes(browserName)
    
    await page.goto('/auth/login')
    await waitForAuthReady(page)
    await page.waitForTimeout(waitTimes.hydration)
    
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    
    // Should show browser validation or stay on page
    await expect(page).toHaveURL(/.*\/auth\/login/)
    
    // Fill only email
    await page.fill('input[placeholder="your@email.com"]', TEST_USER.email)
    await submitButton.click()
    
    // Should still be on login page (password required)
    await expect(page).toHaveURL(/.*\/auth\/login/)
  })

  test('can navigate to signup', async ({ page, browserName }) => {
    const waitTimes = getBrowserWaitTimes(browserName)
    
    await page.goto('/auth/login')
    await waitForAuthReady(page)
    await page.waitForTimeout(waitTimes.hydration)
    
    // Find and click signup link
    const signupLink = page.locator('a[href="/auth/signup"]')
    await expect(signupLink).toBeVisible({ timeout: 5000 })
    await signupLink.click()
    
    // Wait for navigation
    await page.waitForURL('**/auth/signup', { timeout: 10000 })
    await waitForAuthReady(page)
    
    // Verify we're on signup page
    const signupHeading = page.locator('h1').filter({ hasText: 'Create your account' })
    await expect(signupHeading).toBeVisible({ timeout: 10000 })
  })

  test('maintains form state on error', async ({ page, browserName }) => {
    await page.goto('/auth/login')
    await waitForAuthReady(page)
    
    // Fill form with invalid credentials
    const emailInput = page.locator('input[placeholder="your@email.com"]')
    await emailInput.fill(INVALID_USER.email)
    
    const passwordInput = page.locator('input[type="password"]')
    await passwordInput.fill(INVALID_USER.password)
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Wait for error
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 })
    
    // Verify email is still filled (password should be cleared for security)
    await expect(emailInput).toHaveValue(INVALID_USER.email)
  })
})