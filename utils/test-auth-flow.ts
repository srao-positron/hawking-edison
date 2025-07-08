#!/usr/bin/env node
import { chromium } from '@playwright/test'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const testEmail = process.env.TEST_USER_EMAIL || 'test@hawkingedison.com'
const testPassword = process.env.TEST_USER_PASSWORD || 'TestUser123!@#'
const baseUrl = process.env.CI 
  ? 'https://hawking-edison.vercel.app'
  : 'http://localhost:3000'

async function testAuthFlow() {
  console.log('🧪 Testing authentication flow manually...\n')
  console.log('📍 Configuration:')
  console.log('   Base URL:', baseUrl)
  console.log('   Test Email:', testEmail)
  console.log('')

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    })
    const page = await context.newPage()

    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 Browser console error:', msg.text())
      }
    })

    // Test 1: Navigate to home page
    console.log('1️⃣ Testing home page redirect...')
    const homeResponse = await page.goto(baseUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    console.log('   Initial response status:', homeResponse?.status())
    console.log('   Current URL:', page.url())
    
    // Wait for potential redirect
    await page.waitForTimeout(2000)
    console.log('   URL after wait:', page.url())

    // Test 2: Check if we're on login page
    console.log('\n2️⃣ Checking login page elements...')
    try {
      // Try multiple selectors
      const headingSelectors = [
        'text="Welcome back!"',
        'h1:has-text("Welcome back!")',
        '//h1[contains(text(), "Welcome back!")]'
      ]
      
      let headingFound = false
      for (const selector of headingSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 })
          console.log(`   ✅ Found heading with selector: ${selector}`)
          headingFound = true
          break
        } catch {
          console.log(`   ❌ Not found with selector: ${selector}`)
        }
      }

      if (!headingFound) {
        console.log('   ⚠️  Could not find "Welcome back!" heading')
        
        // Debug: print page content
        const bodyText = await page.textContent('body')
        console.log('   Page text preview:', bodyText?.substring(0, 200) + '...')
      }

    } catch (error) {
      console.log('   ❌ Login page check failed:', (error as Error).message)
    }

    // Test 3: Check form elements
    console.log('\n3️⃣ Checking form elements...')
    const elements = {
      'Email input': 'input[placeholder="your@email.com"]',
      'Password input': 'input[type="password"]',
      'Submit button': 'button[type="submit"]'
    }

    for (const [name, selector] of Object.entries(elements)) {
      try {
        const element = await page.waitForSelector(selector, { timeout: 5000 })
        const isVisible = await element.isVisible()
        console.log(`   ${name}: ${isVisible ? '✅ Visible' : '❌ Not visible'}`)
      } catch {
        console.log(`   ${name}: ❌ Not found`)
      }
    }

    // Test 4: Try to fill and submit form
    console.log('\n4️⃣ Testing form submission...')
    try {
      // Fill email
      const emailInput = page.locator('input[placeholder="your@email.com"]')
      await emailInput.fill(testEmail)
      console.log('   ✅ Filled email')

      // Fill password
      const passwordInput = page.locator('input[type="password"]')
      await passwordInput.fill(testPassword)
      console.log('   ✅ Filled password')

      // Click submit
      const submitButton = page.locator('button[type="submit"]:has-text("Sign in")')
      await submitButton.click()
      console.log('   ✅ Clicked submit')

      // Wait for navigation or error
      await page.waitForTimeout(5000)
      console.log('   Current URL:', page.url())

      // Check for error
      const errorAlert = page.locator('[role="alert"]')
      if (await errorAlert.isVisible()) {
        const errorText = await errorAlert.textContent()
        console.log('   ❌ Error alert:', errorText)
      } else if (page.url().includes('/chat')) {
        console.log('   ✅ Successfully redirected to chat')
      } else {
        console.log('   ⚠️  Unexpected state')
      }

    } catch (error) {
      console.log('   ❌ Form submission failed:', (error as Error).message)
    }

    // Test 5: Take screenshot for debugging
    console.log('\n5️⃣ Taking screenshot...')
    const screenshotPath = join(__dirname, '..', 'auth-test-screenshot.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log('   ✅ Screenshot saved to:', screenshotPath)

    console.log('\n✅ Auth flow test complete!')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
  } finally {
    await browser.close()
  }
}

// Run test
testAuthFlow()