#!/usr/bin/env npx tsx

/**
 * Browser-specific authentication testing utility
 * Run with: npm run test:browser-auth
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const browsers = ['chromium', 'firefox', 'webkit']
const testFile = 'e2e/cross-browser/auth-cross-browser.spec.ts'

// Ensure screenshots directory exists
const screenshotsDir = join(process.cwd(), 'test-results', 'browser-auth-screenshots')
if (!existsSync(screenshotsDir)) {
  mkdirSync(screenshotsDir, { recursive: true })
}

console.log('🧪 Testing authentication across browsers...\n')

for (const browser of browsers) {
  console.log(`\n📱 Testing ${browser}...`)
  console.log('=' .repeat(50))
  
  try {
    // Run test with specific browser and options for better debugging
    const command = `npx playwright test ${testFile} --project=${browser} --headed --screenshot=on --video=on --trace=on`
    
    console.log(`Running: ${command}`)
    execSync(command, { 
      stdio: 'inherit',
      env: {
        ...process.env,
        // Add debug environment variables
        DEBUG: 'pw:api',
        PWDEBUG: '1', // This will pause on error
      }
    })
    
    console.log(`✅ ${browser} tests passed!\n`)
  } catch (error) {
    console.log(`❌ ${browser} tests failed!\n`)
    console.log('Check the test-results folder for screenshots and traces.')
    console.log(`Trace viewer: npx playwright show-trace test-results/${browser}-trace.zip\n`)
  }
}

// Run a specific test with all browsers in parallel for comparison
console.log('\n🔄 Running parallel browser comparison...')
try {
  execSync(`npx playwright test ${testFile} --reporter=list`, { stdio: 'inherit' })
} catch (error) {
  console.log('\n❌ Some tests failed in parallel mode')
}

console.log('\n📊 Test Summary:')
console.log('- Check test-results/ for screenshots and videos')
console.log('- Use "npx playwright show-report" to see the full report')
console.log('- For debugging, run: npx playwright test --debug')

// Additional diagnostics
console.log('\n🔍 Browser-Specific Tips:')
console.log('\nFirefox issues:')
console.log('- May need longer timeouts for initial page load')
console.log('- Check for console errors about CORS or CSP')
console.log('- Verify all assets load correctly')

console.log('\nWebKit/Safari issues:')
console.log('- May have stricter security policies')
console.log('- Check for localStorage/sessionStorage access')
console.log('- Verify form autofill behavior')

console.log('\n💡 Quick fixes to try:')
console.log('1. Increase timeouts in playwright.config.ts')
console.log('2. Add explicit waits after navigation')
console.log('3. Use page.waitForLoadState("domcontentloaded") instead of "networkidle"')
console.log('4. Check if Mantine CSS loads differently in each browser')