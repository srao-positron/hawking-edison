#!/usr/bin/env tsx
// Test script for API keys endpoint with authentication
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'
import fetch from 'node-fetch'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const LOCAL_API_URL = 'http://localhost:3001'

// Test user credentials - update these with your test user
const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'testpassword123'

async function testApiKeysEndpoint() {
  console.log('🔍 Testing API Keys Endpoint with Authentication\n')
  console.log('Configuration:')
  console.log(`- Supabase URL: ${SUPABASE_URL}`)
  console.log(`- Local API URL: ${LOCAL_API_URL}`)
  console.log(`- Test Email: ${TEST_EMAIL}\n`)

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  try {
    // Step 1: Sign in to get session
    console.log('Step 1: Signing in...')
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })

    if (signInError) {
      console.error('❌ Sign in failed:', signInError)
      
      // Try to create the user if it doesn't exist
      console.log('\nAttempting to create test user...')
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        options: {
          data: {
            name: 'Test User'
          }
        }
      })

      if (signUpError) {
        console.error('❌ Sign up failed:', signUpError)
        return
      }

      console.log('✅ Test user created successfully')
      
      // Try signing in again
      const { data: retryAuth, error: retryError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })

      if (retryError) {
        console.error('❌ Sign in retry failed:', retryError)
        return
      }

      authData.session = retryAuth.session
    }

    console.log('✅ Signed in successfully')
    console.log(`- User ID: ${authData.user?.id}`)
    console.log(`- Session: ${authData.session ? 'Active' : 'None'}\n`)

    if (!authData.session) {
      console.error('❌ No session returned from sign in')
      return
    }

    // Step 2: Get the session cookies
    console.log('Step 2: Extracting session cookies...')
    const accessToken = authData.session.access_token
    const refreshToken = authData.session.refresh_token

    // Format cookies as they would be sent by browser
    const cookieString = [
      `sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token=${JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        provider_token: null,
        provider_refresh_token: null,
        user: authData.user
      })}`,
      `sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token.0=${JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        provider_token: null,
        provider_refresh_token: null,
        user: authData.user
      }).slice(0, 2048)}`,
      `sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token.1=${JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        provider_token: null,
        provider_refresh_token: null,
        user: authData.user
      }).slice(2048)}`
    ].join('; ')

    console.log('✅ Cookies prepared\n')

    // Step 3: Test the API endpoint
    console.log('Step 3: Testing /api/api-keys endpoint...')
    const response = await fetch(`${LOCAL_API_URL}/api/api-keys`, {
      method: 'GET',
      headers: {
        'Cookie': cookieString,
        'Content-Type': 'application/json'
      }
    })

    console.log(`- Response Status: ${response.status} ${response.statusText}`)
    
    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }

    console.log('- Response Body:', JSON.stringify(responseData, null, 2))

    // Step 4: Test direct Edge Function call (for comparison)
    console.log('\nStep 4: Testing direct Edge Function call...')
    const directResponse = await fetch(`${SUPABASE_URL}/functions/v1/auth-api-keys`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    console.log(`- Direct Response Status: ${directResponse.status} ${directResponse.statusText}`)
    
    const directResponseText = await directResponse.text()
    let directResponseData
    try {
      directResponseData = JSON.parse(directResponseText)
    } catch {
      directResponseData = directResponseText
    }

    console.log('- Direct Response Body:', JSON.stringify(directResponseData, null, 2))

    // Step 5: Check current user via Supabase client
    console.log('\nStep 5: Verifying user session...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('❌ Get user error:', userError)
    } else {
      console.log('✅ Current user:', user?.id, user?.email)
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  } finally {
    // Clean up
    await supabase.auth.signOut()
    console.log('\n🏁 Test completed')
  }
}

// Run the test
testApiKeysEndpoint().catch(console.error)