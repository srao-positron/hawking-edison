#!/usr/bin/env tsx

/**
 * Test what the interact endpoint actually returns
 */

import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const testUserToken = process.env.TEST_USER_TOKEN || ''

async function testInteractResponse() {
  console.log('🧪 Testing interact endpoint response format...\n')
  
  // First, sign in as test user to get a token
  console.log('1️⃣ Signing in test user...')
  const signInResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    },
    body: JSON.stringify({
      email: 'test@hawkingedison.com',
      password: 'TestUser123!@#'
    })
  })
  
  if (!signInResponse.ok) {
    console.error('❌ Failed to sign in:', await signInResponse.text())
    return
  }
  
  const { access_token } = await signInResponse.json()
  console.log('✅ Got access token')
  
  // Test the interact endpoint
  console.log('\n2️⃣ Testing interact endpoint...')
  const response = await fetch(`${supabaseUrl}/functions/v1/interact`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: 'Hello, test message',
      mode: 'async'
    })
  })
  
  console.log(`   Status: ${response.status}`)
  console.log(`   Headers:`, Object.fromEntries(response.headers.entries()))
  
  const result = await response.json()
  console.log('\n3️⃣ Response format:')
  console.log(JSON.stringify(result, null, 2))
  
  // Check what fields are present
  console.log('\n4️⃣ Response analysis:')
  console.log(`   Has sessionId: ${!!result.sessionId}`)
  console.log(`   Has threadId: ${!!result.threadId}`)
  console.log(`   Has status: ${!!result.status}`)
  console.log(`   Has async: ${!!result.async}`)
  console.log(`   Has isNewThread: ${!!result.isNewThread}`)
  console.log(`   Status value: ${result.status}`)
  console.log(`   Async value: ${result.async}`)
}

// Run the test
testInteractResponse()