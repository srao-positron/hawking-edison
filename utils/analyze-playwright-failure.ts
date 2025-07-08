#!/usr/bin/env node
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Script to help analyze Playwright test failures
 * 
 * To use this script:
 * 1. Download the playwright-report artifact from the failed GitHub Actions run
 * 2. Extract it to a folder
 * 3. Run: npx tsx utils/analyze-playwright-failure.ts <path-to-extracted-report>
 */

async function analyzePlaywrightFailure() {
  console.log('📊 Playwright Failure Analysis Guide\n')

  console.log('🔍 Common Playwright CI Failures:\n')

  console.log('1️⃣ Authentication Issues:')
  console.log('   - Test user doesn\'t exist in production')
  console.log('   - Wrong credentials in GitHub secrets')
  console.log('   - Password was changed/reset')
  console.log('   Solution: Run "npx tsx utils/ensure-test-user.ts" in production\n')

  console.log('2️⃣ Timing Issues:')
  console.log('   - Page not fully loaded before interaction')
  console.log('   - Auth redirect takes longer in production')
  console.log('   - React hydration slower in some browsers')
  console.log('   Solution: Increase timeouts in login-helper.ts\n')

  console.log('3️⃣ Element Selection Issues:')
  console.log('   - Selectors changed in recent updates')
  console.log('   - Browser-specific rendering differences')
  console.log('   - Mantine components render differently')
  console.log('   Solution: Use more robust selectors\n')

  console.log('4️⃣ Environment Issues:')
  console.log('   - Missing environment variables')
  console.log('   - Production URL incorrect')
  console.log('   - Deployment not ready')
  console.log('   Solution: Check GitHub secrets and Vercel deployment\n')

  console.log('📋 Steps to Debug:')
  console.log('1. Download artifact from: https://github.com/srao-positron/hawking-edison/actions/runs/16131619965/artifacts/3482038718')
  console.log('2. Extract the zip file')
  console.log('3. Open index.html in the extracted folder')
  console.log('4. Look for:')
  console.log('   - Red test cases (failures)')
  console.log('   - Error messages and stack traces')
  console.log('   - Screenshots at point of failure')
  console.log('   - Video recordings of failed tests')
  console.log('   - Network request logs')
  console.log('5. Check "Trace Viewer" for step-by-step execution\n')

  console.log('🛠️ Quick Fixes to Try:')
  console.log('1. Ensure test user exists:')
  console.log('   npx tsx utils/ensure-test-user.ts\n')
  console.log('2. Verify test user locally:')
  console.log('   npx tsx utils/verify-test-user.ts\n')
  console.log('3. Test auth flow manually:')
  console.log('   npx tsx utils/test-auth-flow.ts\n')
  console.log('4. Debug Playwright config:')
  console.log('   npx tsx utils/debug-playwright.ts\n')

  console.log('💡 Tips:')
  console.log('- Failed tests often show screenshots at failure point')
  console.log('- Video recordings show exactly what happened')
  console.log('- Trace files can be opened in trace.playwright.dev')
  console.log('- Look for console errors in the browser logs')
  console.log('- Check network tab for failed API requests\n')
}

// Run analysis
analyzePlaywrightFailure()