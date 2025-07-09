#!/usr/bin/env npx tsx
// Test direct Edge Function calls with cross-domain authentication

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

const SUPABASE_URL = 'https://service.hawkingedison.com'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbnBsZHlkbWt6dXBzZmFnbnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc0ODYsImV4cCI6MjA2NzI3MzQ4Nn0.aMD9ip6-KSiH-pXsbhkpC1utVHgufc2v4PWrFmXW_cs'

async function testDirectEdgeFunctions() {
  console.log('🧪 Testing Direct Edge Function Calls')
  console.log('=====================================\n')
  
  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  try {
    // Step 1: Sign in to get a session
    console.log('1️⃣ Signing in...')
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@hawkingedison.com',
      password: 'test123456'
    })
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message)
      
      // Try to create the user
      console.log('\n📝 Creating test user...')
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'test@hawkingedison.com',
        password: 'test123456',
        options: {
          data: { name: 'Test User' }
        }
      })
      
      if (signUpError) {
        console.error('❌ Sign up failed:', signUpError.message)
        return
      }
      
      console.log('✅ User created')
      
      // Try signing in again
      const { data: retryAuth, error: retryError } = await supabase.auth.signInWithPassword({
        email: 'test@hawkingedison.com',
        password: 'test123456'
      })
      
      if (retryError) {
        console.error('❌ Sign in retry failed:', retryError.message)
        return
      }
      
      authData.session = retryAuth.session
    }
    
    if (!authData.session) {
      console.error('❌ No session returned')
      return
    }
    
    console.log('✅ Signed in successfully')
    console.log(`   User ID: ${authData.user?.id}`)
    console.log(`   Email: ${authData.user?.email}`)
    console.log(`   Token: ${authData.session.access_token.substring(0, 50)}...`)
    
    // Step 2: Test Edge Function with OPTIONS (preflight)
    console.log('\n2️⃣ Testing CORS preflight...')
    const optionsResponse = await fetch(`${SUPABASE_URL}/functions/v1/auth-api-keys`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://hawkingedison.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization, content-type'
      }
    })
    
    console.log(`   Status: ${optionsResponse.status}`)
    console.log('   CORS Headers:')
    console.log(`   - Allow-Origin: ${optionsResponse.headers.get('access-control-allow-origin')}`)
    console.log(`   - Allow-Methods: ${optionsResponse.headers.get('access-control-allow-methods')}`)
    console.log(`   - Allow-Headers: ${optionsResponse.headers.get('access-control-allow-headers')}`)
    console.log(`   - Allow-Credentials: ${optionsResponse.headers.get('access-control-allow-credentials')}`)
    
    // Step 3: Test GET /auth-api-keys
    console.log('\n3️⃣ Testing GET /auth-api-keys...')
    const getResponse = await fetch(`${SUPABASE_URL}/functions/v1/auth-api-keys`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json',
        'Origin': 'https://hawkingedison.com'
      }
    })
    
    console.log(`   Status: ${getResponse.status} ${getResponse.statusText}`)
    
    const getData = await getResponse.text()
    let getResult
    try {
      getResult = JSON.parse(getData)
      console.log('   Response:', JSON.stringify(getResult, null, 2))
    } catch {
      console.log('   Response (text):', getData)
    }
    
    // Step 4: Test POST /auth-api-keys (create a key)
    console.log('\n4️⃣ Testing POST /auth-api-keys (create key)...')
    const createResponse = await fetch(`${SUPABASE_URL}/functions/v1/auth-api-keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json',
        'Origin': 'https://hawkingedison.com'
      },
      body: JSON.stringify({
        name: 'Test API Key',
        expiresInDays: 30,
        environment: 'test'
      })
    })
    
    console.log(`   Status: ${createResponse.status} ${createResponse.statusText}`)
    
    const createData = await createResponse.text()
    let createResult
    try {
      createResult = JSON.parse(createData)
      console.log('   Response:', JSON.stringify(createResult, null, 2))
    } catch {
      console.log('   Response (text):', createData)
    }
    
    // Step 5: Test with service role key and X-User-Id
    console.log('\n5️⃣ Testing with service role key...')
    const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbnBsZHlkbWt6dXBzZmFnbnZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5NzQ4NiwiZXhwIjoyMDY3MjczNDg2fQ.-Huq2EpxX36iXMDuTIJ7--XxmLJm3zCzhQ189kC4T-k'
    
    const serviceResponse = await fetch(`${SUPABASE_URL}/functions/v1/auth-api-keys`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'X-User-Id': authData.user?.id || '',
        'Content-Type': 'application/json',
        'Origin': 'https://hawkingedison.com'
      }
    })
    
    console.log(`   Status: ${serviceResponse.status} ${serviceResponse.statusText}`)
    
    const serviceData = await serviceResponse.text()
    try {
      const serviceResult = JSON.parse(serviceData)
      console.log('   Response:', JSON.stringify(serviceResult, null, 2))
    } catch {
      console.log('   Response (text):', serviceData)
    }
    
    // Step 6: Browser simulation test
    console.log('\n6️⃣ Simulating browser cookies...')
    console.log('   In a browser, cookies would be set with:')
    console.log('   - Domain: .hawkingedison.com')
    console.log('   - Path: /')
    console.log('   - Secure: true')
    console.log('   - SameSite: Lax')
    console.log('   - HttpOnly: true')
    console.log('\n   This allows the cookies to be sent with requests to:')
    console.log('   - hawkingedison.com')
    console.log('   - www.hawkingedison.com')
    console.log('   - service.hawkingedison.com')
    console.log('   - any.subdomain.hawkingedison.com')
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
  }
  
  console.log('\n✅ Test completed')
}

// Run the test
testDirectEdgeFunctions().catch(console.error)