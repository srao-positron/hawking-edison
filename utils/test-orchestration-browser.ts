#!/usr/bin/env npx tsx
// Test orchestration through the browser API

import fetch from 'node-fetch'

async function testOrchestrationViaBrowser() {
  console.log('🧪 Testing orchestration via browser API...\n')
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  try {
    // Test async orchestration request
    console.log('1️⃣ Sending orchestration test request...')
    
    const testRequest = {
      input: 'Run a panel discussion with 3 experts about the future of AI',
      mode: 'async'
    }
    
    const response = await fetch(`${baseUrl}/api/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The browser would have auth cookies
        'Cookie': process.env.AUTH_COOKIE || ''
      },
      body: JSON.stringify(testRequest)
    })
    
    const result = await response.json()
    console.log('Response status:', response.status)
    console.log('Response:', JSON.stringify(result, null, 2))
    
    if (!response.ok) {
      throw new Error(`API error: ${result.error || response.statusText}`)
    }
    
    if (result.data?.sessionId) {
      console.log(`\n✅ Orchestration session created: ${result.data.sessionId}`)
      console.log('The request is being processed asynchronously.')
      console.log('\nTo monitor the session:')
      console.log(`1. Check orchestration_sessions table in Supabase`)
      console.log(`2. Check AWS CloudWatch logs for Lambda execution`)
      console.log(`3. Use realtime subscription to get updates`)
    } else if (result.data?.async === false) {
      console.log('\n✅ Request handled synchronously')
      console.log('Response:', result.data.response)
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Instructions for getting auth cookie
console.log('To test with authentication:')
console.log('1. Log in at http://localhost:3000/auth/login')
console.log('2. Open browser DevTools → Application → Cookies')
console.log('3. Copy the sb-bknpldydmkzupsfagnva-auth-token cookie value')
console.log('4. Run: AUTH_COOKIE="sb-bknpldydmkzupsfagnva-auth-token=<value>" npx tsx utils/test-orchestration-browser.ts')
console.log('\nOr test without auth to see the authentication error handling.\n')

// Run the test
testOrchestrationViaBrowser()