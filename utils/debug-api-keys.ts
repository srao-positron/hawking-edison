#!/usr/bin/env node

// Debug API Keys Endpoint
// Usage: npm run debug:api-keys

import * as dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function debugApiKeys() {
  console.log('\n🔍 Debugging API Keys Issue\n')

  // 1. First, create a test user and get a valid session
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  const testEmail = `sid+he-debug-${Date.now()}@hawkingedison.com`
  const testPassword = 'test-password-123'
  
  console.log('Creating test user...')
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  })

  if (authError) {
    console.error('Failed to create test user:', authError)
    return
  }

  const userId = authData.user.id
  console.log(`✓ Created test user: ${testEmail}`)

  // 2. Sign in to get access token
  const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: signInData, error: signInError } = await userSupabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })

  if (signInError) {
    console.error('Failed to sign in:', signInError)
    await supabase.auth.admin.deleteUser(userId)
    return
  }

  const accessToken = signInData.session?.access_token
  console.log('✓ Signed in successfully')
  console.log(`  Access token: ${accessToken?.substring(0, 20)}...`)

  // 3. Test the API endpoint directly
  console.log('\nTesting /api/keys endpoint...')
  const port = process.env.PORT || '3000'
  const response = await fetch(`http://localhost:${port}/api/keys`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  console.log(`Response status: ${response.status} ${response.statusText}`)
  console.log(`Response headers:`)
  response.headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`)
  })

  const text = await response.text()
  console.log('\nResponse body:')
  console.log(text)

  // Try to parse as JSON
  try {
    const json = JSON.parse(text)
    console.log('\nParsed JSON:')
    console.log(JSON.stringify(json, null, 2))
    
    // Check the response format
    if (json.success && json.data && json.data.keys) {
      console.log('\n✓ Response format is correct')
      console.log(`  Found ${json.data.keys.length} keys`)
    } else if (json.data && json.data.keys) {
      console.log('\n⚠️  Response has data.keys but missing success field')
    } else {
      console.log('\n❌ Response format is incorrect')
      console.log('Expected: { success: true, data: { keys: [...] } }')
      console.log('Actual:', Object.keys(json))
    }
  } catch (e) {
    console.error('\n❌ Failed to parse response as JSON:', e)
  }

  // 4. Clean up
  console.log('\nCleaning up...')
  await supabase.auth.admin.deleteUser(userId)
  console.log('✓ Test user deleted')
}

debugApiKeys().catch(error => {
  console.error('\n❌ Debug failed:', error)
  process.exit(1)
})