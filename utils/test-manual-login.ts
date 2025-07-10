#!/usr/bin/env npx tsx
/**
 * Manual test script for login flow
 */

import * as puppeteer from 'puppeteer'

async function testLogin() {
  console.log('🔍 Testing Manual Login Flow\n')

  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const page = await browser.newPage()
  
  // Enable console logging
  page.on('console', msg => console.log('Browser console:', msg.text()))
  
  try {
    // 1. Go to login page
    console.log('1️⃣ Navigating to login page...')
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle0' })
    await page.waitForTimeout(1000)
    
    // 2. Fill in credentials
    console.log('2️⃣ Filling in credentials...')
    await page.type('input[placeholder="your@email.com"]', 'siddhartha.s.rao@gmail.com')
    await page.type('input[placeholder="Your password"]', 'Ctigroup1@')
    
    // 3. Take screenshot before submit
    await page.screenshot({ path: 'test-results/manual-before-submit.png' })
    
    // 4. Click login button
    console.log('3️⃣ Clicking submit...')
    await page.click('button[type="submit"]')
    
    // 5. Wait for navigation
    console.log('4️⃣ Waiting for navigation...')
    await page.waitForTimeout(3000)
    
    // 6. Check where we ended up
    const currentUrl = page.url()
    console.log('5️⃣ Current URL:', currentUrl)
    
    // 7. Take screenshot after login
    await page.screenshot({ path: 'test-results/manual-after-login.png' })
    
    if (currentUrl.includes('chat')) {
      console.log('✅ Successfully logged in and redirected to chat!')
      
      // Now go to debug page
      console.log('\n6️⃣ Navigating to debug page...')
      await page.goto('http://localhost:3000/debug-auth', { waitUntil: 'networkidle0' })
      await page.waitForTimeout(2000)
      
      // Take screenshot of debug page
      await page.screenshot({ path: 'test-results/manual-debug-page.png', fullPage: true })
      
      // Get the debug info
      const debugInfo = await page.evaluate(() => {
        const preElements = document.querySelectorAll('pre')
        const debugData: any = {}
        preElements.forEach((pre, index) => {
          const heading = pre.parentElement?.querySelector('h2')?.textContent || `Section ${index}`
          debugData[heading] = pre.textContent
        })
        return debugData
      })
      
      console.log('\n📋 Debug Info:')
      Object.entries(debugInfo).forEach(([key, value]) => {
        console.log(`\n${key}:`)
        console.log(value)
      })
      
    } else {
      console.log('❌ Login failed, still on:', currentUrl)
      
      // Check for error messages
      const errorText = await page.evaluate(() => {
        const alerts = document.querySelectorAll('.mantine-Alert, [role="alert"]')
        return Array.from(alerts).map(el => el.textContent).join('\n')
      })
      if (errorText) {
        console.log('Error messages:', errorText)
      }
    }
    
    console.log('\n\nKeeping browser open for manual inspection.')
    console.log('Press Ctrl+C to close.')
    
    // Keep browser open
    await new Promise(() => {})
    
  } catch (error) {
    console.error('Test failed:', error)
    await browser.close()
  }
}

// Run the test
testLogin().catch(console.error)