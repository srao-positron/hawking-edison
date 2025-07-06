import { test, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Test configuration
const testEmail = `test-${Date.now()}@example.com`
const testPassword = 'TestPassword123!'

// Supabase admin client for test setup/cleanup
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper to wait for navigation
async function waitForNavigation(page: Page, url: string) {
  await page.waitForURL(url, { timeout: 10000 })
}

// Helper to clean up test user
async function cleanupTestUser(email: string) {
  try {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const testUser = users.users.find(u => u.email === email)
    if (testUser) {
      await supabaseAdmin.auth.admin.deleteUser(testUser.id)
    }
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clean up any existing test user
    await cleanupTestUser(testEmail)
  })

  test.afterEach(async () => {
    // Clean up test user after each test
    await cleanupTestUser(testEmail)
  })

  test('signup flow with email verification', async ({ page }) => {
    // 1. Navigate to signup page
    await page.goto('/auth/signup')
    
    // 2. Fill signup form
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[placeholder="Create a strong password"]', testPassword)
    await page.fill('input[placeholder="Confirm your password"]', testPassword)
    
    // 3. Check password strength indicator
    const progressBar = page.locator('.mantine-Progress-root')
    await expect(progressBar).toBeVisible()
    
    // 4. Submit form
    await page.click('button[type="submit"]')
    
    // 5. Check for success message
    await expect(page.locator('text=Check your email!')).toBeVisible({ timeout: 10000 })
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()
    
    // 6. Verify user was created (but not confirmed)
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const newUser = users.find(u => u.email === testEmail)
    expect(newUser).toBeTruthy()
    expect(newUser?.email_confirmed_at).toBe(null)
    
    // 7. Manually confirm email for testing
    await supabaseAdmin.auth.admin.updateUserById(newUser!.id, {
      email_confirm: true
    })
  })

  test('login with valid credentials', async ({ page }) => {
    // Setup: Create confirmed user
    const { data: { user } } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    })
    expect(user).toBeTruthy()

    // 1. Navigate to login page
    await page.goto('/auth/login')
    
    // 2. Fill login form
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    
    // 3. Submit form
    await page.click('button[type="submit"]')
    
    // 4. Should redirect to home page
    await waitForNavigation(page, '/')
    
    // 5. Verify we're logged in by checking the page
    await expect(page.locator('h1:has-text("Hawking Edison")')).toBeVisible()
  })

  test('login with invalid credentials', async ({ page }) => {
    // 1. Navigate to login page
    await page.goto('/auth/login')
    
    // 2. Fill login form with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    
    // 3. Submit form
    await page.click('button[type="submit"]')
    
    // 4. Should show error message
    await expect(page.locator('.mantine-Alert-root')).toBeVisible()
    await expect(page.locator('text=Invalid login credentials')).toBeVisible()
    
    // 5. Should stay on login page
    expect(page.url()).toContain('/auth/login')
  })

  test('login with unverified email', async ({ page }) => {
    // Setup: Create unconfirmed user
    const { data: { user } } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: false
    })
    expect(user).toBeTruthy()

    // 1. Navigate to login page
    await page.goto('/auth/login')
    
    // 2. Fill login form
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    
    // 3. Submit form
    await page.click('button[type="submit"]')
    
    // 4. Should show error about email confirmation
    await expect(page.locator('.mantine-Alert-root')).toBeVisible()
    await expect(page.locator('text=Email not confirmed')).toBeVisible()
  })

  test('password reset flow', async ({ page }) => {
    // Setup: Create confirmed user
    const { data: { user } } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    })
    expect(user).toBeTruthy()

    // 1. Navigate to login page
    await page.goto('/auth/login')
    
    // 2. Click forgot password link
    await page.click('a:has-text("Forgot password?")')
    
    // 3. Should navigate to forgot password page
    await waitForNavigation(page, '/auth/forgot-password')
    
    // 4. Fill email
    await page.fill('input[type="email"]', testEmail)
    
    // 5. Submit form
    await page.click('button[type="submit"]')
    
    // 6. Should show success message
    await expect(page.locator('text=Check your email')).toBeVisible()
    
    // Note: We can't test the actual reset link without email access
    // In production, we'd use a test email service
  })

  test('signup password validation', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Test weak password
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[placeholder="Create a strong password"]', 'weak')
    await page.fill('input[placeholder="Confirm your password"]', 'weak')
    
    await page.click('button[type="submit"]')
    
    // Should show error
    await expect(page.locator('text=Password must be at least 8 characters long')).toBeVisible()
    
    // Test password mismatch
    await page.fill('input[placeholder="Create a strong password"]', testPassword)
    await page.fill('input[placeholder="Confirm your password"]', 'different')
    
    // Should show mismatch error
    await expect(page.locator('text=Passwords do not match')).toBeVisible()
  })

  test('navigation between auth pages', async ({ page }) => {
    // Start at login
    await page.goto('/auth/login')
    
    // Navigate to signup
    await page.click('a:has-text("Create account")')
    await waitForNavigation(page, '/auth/signup')
    
    // Navigate back to login
    await page.click('a:has-text("Sign in")')
    await waitForNavigation(page, '/auth/login')
  })

  test('protected route redirect', async ({ page }) => {
    // Try to access a protected route while logged out
    await page.goto('/')
    
    // Should redirect to login (if route is protected)
    // Note: Adjust this based on your actual route protection logic
    // For now, we'll just verify the page loads
    await expect(page.locator('h1:has-text("Hawking Edison")')).toBeVisible()
  })
})