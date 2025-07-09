#!/usr/bin/env tsx
// Test API keys endpoint with existing test user
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const LOCAL_API_URL = 'http://localhost:3001'

async function testWithExistingUser() {
  console.log('🔍 Testing API Keys Endpoint with Existing Test User\n')

  // Load test user credentials
  const testUserPath = resolve(__dirname, '../.test-user.json')
  if (!fs.existsSync(testUserPath)) {
    console.error('❌ No test user found. Run: npx tsx utils/create-test-user.ts')
    return
  }

  const testUser = JSON.parse(fs.readFileSync(testUserPath, 'utf-8'))
  console.log('Test User:', testUser.email)
  console.log('User ID:', testUser.userId)
  console.log('')

  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Step 1: Sign in to get session
    console.log('Step 1: Signing in...')
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    })

    if (signInError) {
      console.error('❌ Sign in failed:', signInError)
      return
    }

    console.log('✅ Signed in successfully')
    console.log(`- Access Token: ${authData.session?.access_token.substring(0, 20)}...`)
    console.log('')

    // Step 2: Test the API endpoint with session
    console.log('Step 2: Testing /api/api-keys endpoint...')
    
    // Get the cookie value from the session
    // For custom domain, the cookie name is based on the subdomain
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    let cookieName: string
    
    if (supabaseUrl.includes('supabase.co')) {
      // Standard Supabase URL: https://xxx.supabase.co
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1]
      cookieName = `sb-${projectRef}-auth-token`
    } else {
      // Custom domain: https://service.hawkingedison.com
      const subdomain = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || 'service'
      cookieName = `sb-${subdomain}-auth-token`
    }
    
    console.log(`- Supabase URL: ${supabaseUrl}`)
    console.log(`- Cookie Name: ${cookieName}`)
    
    const sessionData = {
      access_token: authData.session!.access_token,
      refresh_token: authData.session!.refresh_token,
      provider_token: null,
      provider_refresh_token: null,
      user: authData.user
    }
    
    // Format the cookie as it would be in the browser
    const cookieValue = JSON.stringify(sessionData)
    const cookies = `${cookieName}=${encodeURIComponent(cookieValue)}`
    
    console.log(`- Cookie Length: ${cookieValue.length} chars`)
    console.log('')

    const response = await fetch(`${LOCAL_API_URL}/api/api-keys`, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      }
    })

    console.log(`Response Status: ${response.status} ${response.statusText}`)
    
    let responseData
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json()
      console.log('Response:', JSON.stringify(responseData, null, 2))
    } else {
      const text = await response.text()
      console.log('Response (non-JSON):', text.substring(0, 200) + '...')
    }
    console.log('')

    // Step 3: Check server logs
    console.log('Step 3: Check server logs')
    console.log('Look for [API Keys Route] logs in the terminal running "npm run dev"')
    console.log('These logs will show:')
    console.log('- What cookies were received')
    console.log('- Whether authentication succeeded')
    console.log('- Any errors from Supabase auth')
    console.log('')

    // Step 4: Test with direct API key (if available)
    if (testUser.apiKey) {
      console.log('Step 4: Testing with API key directly...')
      const apiKeyResponse = await fetch(`${LOCAL_API_URL}/api/api-keys`, {
        method: 'GET',
        headers: {
          'X-API-Key': testUser.apiKey,
          'Content-Type': 'application/json'
        }
      })

      console.log(`API Key Response Status: ${apiKeyResponse.status} ${apiKeyResponse.statusText}`)
      const apiKeyData = await apiKeyResponse.json()
      console.log('API Key Response:', JSON.stringify(apiKeyData, null, 2))
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await supabase.auth.signOut()
    console.log('\n🏁 Test completed')
  }
}

// Run the test
testWithExistingUser().catch(console.error)