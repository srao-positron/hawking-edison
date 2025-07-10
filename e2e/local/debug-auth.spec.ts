import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: 'siddhartha.s.rao@gmail.com',
  password: 'Ctigroup1@'
}

test.describe('Debug Authentication', () => {
  test('debug login flow', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text())
      }
    })

    // Go to login page
    await page.goto('/auth/login')
    
    // Take screenshot before login
    await page.screenshot({ path: 'test-results/before-login.png' })
    
    // Wait for form to be ready
    await expect(page.locator('h1, h2').filter({ hasText: /Welcome back/i })).toBeVisible()
    
    // Fill credentials
    await page.locator('input[placeholder="your@email.com"]').fill(TEST_USER.email)
    await page.locator('input[placeholder="Your password"]').fill(TEST_USER.password)
    
    // Take screenshot after filling
    await page.screenshot({ path: 'test-results/after-fill.png' })
    
    // Click submit and wait for navigation
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('auth') || resp.url().includes('login')),
      page.locator('button[type="submit"]').click()
    ])
    
    console.log('Auth response:', response.url(), response.status())
    
    // Wait a bit for any redirects
    await page.waitForTimeout(3000)
    
    // Check where we ended up
    const currentUrl = page.url()
    console.log('Current URL after login:', currentUrl)
    
    // Take screenshot after login attempt
    await page.screenshot({ path: 'test-results/after-login.png' })
    
    // Check if we're still on login page
    if (currentUrl.includes('login')) {
      // Check for error messages
      const errorMessage = await page.locator('.mantine-Alert, [role="alert"], text=/error|invalid|failed/i').textContent().catch(() => null)
      console.log('Error message found:', errorMessage)
      
      // Check localStorage and sessionStorage
      const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage))
      const sessionStorage = await page.evaluate(() => JSON.stringify(window.sessionStorage))
      console.log('LocalStorage:', localStorage)
      console.log('SessionStorage:', sessionStorage)
      
      // Check for Supabase auth cookies
      const cookies = await page.context().cookies()
      const authCookies = cookies.filter(c => c.name.includes('auth') || c.name.includes('supabase'))
      console.log('Auth cookies:', authCookies)
    }
    
    // Final assertion
    expect(currentUrl).not.toContain('login')
  })

  test('check supabase connection', async ({ page }) => {
    await page.goto('/')
    
    // Check if Supabase is initialized
    const supabaseCheck = await page.evaluate(async () => {
      try {
        // Check if window has any Supabase references
        const hasSupabase = 'supabase' in window || document.cookie.includes('supabase')
        
        // Try to access Supabase URL from env
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'not found'
        
        return {
          hasSupabase,
          supabaseUrl,
          cookies: document.cookie
        }
      } catch (error) {
        return { error: error.message }
      }
    })
    
    console.log('Supabase check:', supabaseCheck)
  })
})