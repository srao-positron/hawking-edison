import { Page, expect } from '@playwright/test'

/**
 * Robust cross-browser login helper
 * Addresses timing issues with Firefox and WebKit
 */
export async function loginUser(page: Page, email: string, password: string) {
  // Navigate to login page with explicit wait
  await page.goto('/auth/login', { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  })
  
  // Wait for the page to be fully loaded
  // Firefox and WebKit may need extra time for hydration
  await page.waitForLoadState('networkidle', { timeout: 30000 })
  
  // Additional wait for client-side hydration
  // This is crucial for Firefox/WebKit where React hydration may be slower
  await page.waitForTimeout(1000)
  
  // Wait for the heading with multiple strategies
  // Try different selectors as browsers may render differently
  const headingSelectors = [
    'h1:has-text("Welcome back!")',
    'h1:text-is("Welcome back!")',
    'h1 >> text="Welcome back!"',
    '//h1[contains(text(), "Welcome back!")]'
  ]
  
  let headingFound = false
  for (const selector of headingSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000, state: 'visible' })
      headingFound = true
      break
    } catch (e) {
      // Try next selector
    }
  }
  
  if (!headingFound) {
    // If heading not found, wait for form elements as fallback
    await page.waitForSelector('input[placeholder="your@email.com"]', { 
      timeout: 10000, 
      state: 'visible' 
    })
  }
  
  // Wait for form to be interactive
  await page.waitForFunction(() => {
    const emailInput = document.querySelector('input[placeholder="your@email.com"]') as HTMLInputElement
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement
    
    return emailInput && passwordInput && submitButton && 
           !emailInput.disabled && !passwordInput.disabled && !submitButton.disabled
  }, { timeout: 10000 })
  
  // Clear and fill email field with retry logic
  const emailInput = page.locator('input[placeholder="your@email.com"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 5000 })
  await emailInput.click()
  await emailInput.clear()
  await emailInput.fill(email)
  
  // Verify email was filled correctly
  await expect(emailInput).toHaveValue(email, { timeout: 5000 })
  
  // Clear and fill password field
  const passwordInput = page.locator('input[type="password"]').first()
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 })
  await passwordInput.click()
  await passwordInput.clear()
  await passwordInput.fill(password)
  
  // Verify password was filled
  await expect(passwordInput).not.toHaveValue('', { timeout: 5000 })
  
  // Find and click submit button with better targeting
  const submitButton = page.locator('button[type="submit"]:has-text("Sign in")').first()
  await submitButton.waitFor({ state: 'visible', timeout: 5000 })
  
  // Ensure button is enabled before clicking
  await expect(submitButton).toBeEnabled({ timeout: 5000 })
  
  // Click with retry logic for Firefox/WebKit
  let clicked = false
  for (let i = 0; i < 3; i++) {
    try {
      await submitButton.click({ timeout: 5000 })
      clicked = true
      break
    } catch (e) {
      // Retry after a short wait
      await page.waitForTimeout(500)
    }
  }
  
  if (!clicked) {
    // Fallback: try JavaScript click
    await submitButton.evaluate((el: HTMLElement) => el.click())
  }
  
  // Wait for navigation or error
  try {
    // Wait for successful navigation to chat
    await page.waitForURL('**/chat', { timeout: 15000 })
    await page.waitForLoadState('networkidle', { timeout: 10000 })
  } catch (navigationError) {
    // Check if there's an error alert instead
    // Exclude the Next.js route announcer which also has role="alert"
    const errorAlert = page.locator('[role="alert"]').filter({ hasNot: page.locator('#__next-route-announcer__') })
    if (await errorAlert.first().isVisible()) {
      // Login failed with error - this is expected for invalid credentials
      return
    }
    // Re-throw if neither navigation nor error occurred
    throw navigationError
  }
}

/**
 * Wait for auth to be ready on the page
 * Useful for ensuring auth state is properly initialized
 */
export async function waitForAuthReady(page: Page) {
  // Wait for any auth-related loading to complete
  await page.waitForLoadState('networkidle', { timeout: 30000 })
  
  // Additional wait for hydration on slower browsers
  await page.waitForTimeout(1500)
  
  // Check if we're on a page that requires auth
  const currentUrl = page.url()
  if (currentUrl.includes('/auth/')) {
    // We're on an auth page, wait for it to be interactive
    await page.waitForFunction(() => {
      const inputs = document.querySelectorAll('input')
      const buttons = document.querySelectorAll('button')
      return inputs.length > 0 && buttons.length > 0
    }, { timeout: 10000 })
  }
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const currentUrl = page.url()
  
  // If we're on chat page, we're likely logged in
  if (currentUrl.includes('/chat')) {
    return true
  }
  
  // If we're on auth pages, we're likely not logged in
  if (currentUrl.includes('/auth/')) {
    return false
  }
  
  // Check for auth-specific elements
  try {
    // Look for logout button or user menu as indicators of being logged in
    await page.waitForSelector('[aria-label="User menu"], button:has-text("Logout"), button:has-text("Sign out")', {
      timeout: 3000,
      state: 'visible'
    })
    return true
  } catch {
    return false
  }
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  // Try to find and click logout button
  const logoutSelectors = [
    'button:has-text("Logout")',
    'button:has-text("Sign out")',
    '[aria-label="Logout"]',
    '[aria-label="Sign out"]'
  ]
  
  for (const selector of logoutSelectors) {
    try {
      const button = page.locator(selector).first()
      if (await button.isVisible()) {
        await button.click()
        await page.waitForURL('**/auth/login', { timeout: 10000 })
        return
      }
    } catch {
      // Try next selector
    }
  }
  
  // If no logout button found, navigate directly to login
  await page.goto('/auth/login')
}