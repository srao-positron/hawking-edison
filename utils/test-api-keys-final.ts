#!/usr/bin/env tsx
// Final comprehensive test for API keys endpoint authentication
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const LOCAL_API_URL = 'http://localhost:3001'

async function finalApiKeysTest() {
  console.log('🔍 Final API Keys Authentication Test\n')

  // Load test user
  const testUserPath = resolve(__dirname, '../.test-user.json')
  const testUser = JSON.parse(fs.readFileSync(testUserPath, 'utf-8'))

  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Sign in
    console.log('Signing in...')
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    })

    if (error) {
      console.error('Sign in failed:', error)
      return
    }

    const session = authData.session!
    console.log('✅ Signed in successfully\n')

    // Test 1: With properly formatted chunked cookies
    console.log('Test 1: With chunked cookies (Supabase SSR format)')
    
    const cookieBase = 'sb-service-auth-token'
    const sessionString = JSON.stringify({
      access_token: session.access_token,
      token_type: session.token_type,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
      refresh_token: session.refresh_token,
      user: authData.user
    })

    // Chunk the cookie if needed (Supabase chunks at 3600 chars)
    const chunks: string[] = []
    const chunkSize = 3600
    
    if (sessionString.length > chunkSize) {
      for (let i = 0; i < sessionString.length; i += chunkSize) {
        chunks.push(sessionString.slice(i, i + chunkSize))
      }
    } else {
      chunks.push(sessionString)
    }

    // Format cookies
    let cookieHeader = ''
    if (chunks.length === 1) {
      cookieHeader = `${cookieBase}=${encodeURIComponent(chunks[0])}`
    } else {
      const cookieParts = chunks.map((chunk, i) => 
        `${cookieBase}.${i}=${encodeURIComponent(chunk)}`
      ).join('; ')
      cookieHeader = cookieParts
    }

    console.log(`Cookie chunks: ${chunks.length}`)
    console.log(`Cookie header length: ${cookieHeader.length}\n`)

    const response1 = await fetch(`${LOCAL_API_URL}/api/api-keys`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': 'application/json'
      }
    })

    console.log(`Response: ${response1.status} ${response1.statusText}`)
    if (response1.headers.get('content-type')?.includes('application/json')) {
      const data = await response1.json()
      console.log('Data:', JSON.stringify(data, null, 2))
    }
    console.log('')

    // Test 2: With Authorization header (direct Edge Function style)
    console.log('Test 2: With Authorization header')
    
    const response2 = await fetch(`${LOCAL_API_URL}/api/api-keys`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log(`Response: ${response2.status} ${response2.statusText}`)
    if (response2.headers.get('content-type')?.includes('application/json')) {
      const data = await response2.json()
      console.log('Data:', JSON.stringify(data, null, 2))
    }
    console.log('')

    // Test 3: Check what happens in browser
    console.log('Test 3: Browser test instructions')
    console.log('1. Open http://localhost:3001/test-api-keys')
    console.log('2. Sign in with:')
    console.log(`   Email: ${testUser.email}`)
    console.log(`   Password: ${testUser.password}`)
    console.log('3. Click "Test /api/api-keys"')
    console.log('4. Check the debug logs on the page')
    console.log('')

    // Test 4: Direct curl command
    console.log('Test 4: Manual curl test')
    console.log('Run this command to test with proper auth:\n')
    console.log(`curl -X GET ${LOCAL_API_URL}/api/api-keys \\`)
    console.log(`  -H "Cookie: ${cookieBase}=${encodeURIComponent(chunks[0]).substring(0, 100)}..." \\`)
    console.log(`  -H "Content-Type: application/json"`)
    console.log('')

    // Show server logs location
    console.log('📋 Check server logs for:')
    console.log('- [API Keys Route] Starting GET request')
    console.log('- [API Keys Route] All cookies:')
    console.log('- [API Keys Route] Auth error: (if any)')
    console.log('')

    console.log('🔍 Debugging tips:')
    console.log('1. The cookie name must match the Supabase project')
    console.log(`   Your cookie name: ${cookieBase}`)
    console.log('2. Cookies must be properly encoded')
    console.log('3. Session must include all required fields')
    console.log('4. Check if middleware is interfering')

  } catch (error) {
    console.error('Test error:', error)
  } finally {
    await supabase.auth.signOut()
  }
}

finalApiKeysTest().catch(console.error)