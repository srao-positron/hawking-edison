#!/usr/bin/env tsx

/**
 * Test script for API Keys Edge Function
 * Usage: npx tsx utils/test-api-keys-edge-function.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bknpldydmkzupsfagnva.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbnBsZHlkbWt6dXBzZmFnbnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc0ODYsImV4cCI6MjA2NzI3MzQ4Nn0.aMD9ip6-KSiH-pXsbhkpC1utVHgufc2v4PWrFmXW_cs'

async function testApiKeys() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Sign in with a test user
  console.log('🔐 Signing in...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  })

  if (authError) {
    console.error('❌ Auth error:', authError.message)
    // Try to create the user if it doesn't exist
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123'
    })
    
    if (signUpError) {
      console.error('❌ Sign up error:', signUpError.message)
      return
    }
    
    console.log('✅ User created, signing in...')
    const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    })
    
    if (authError2) {
      console.error('❌ Auth error after signup:', authError2.message)
      return
    }
  }

  console.log('✅ Authenticated as:', authData?.user?.email)
  
  const session = authData?.session || (await supabase.auth.getSession()).data.session
  
  if (!session) {
    console.error('❌ No session found')
    return
  }

  // Test listing API keys
  console.log('\n📋 Testing GET /auth-api-keys...')
  const listResponse = await fetch('https://service.hawkingedison.com/functions/v1/auth-api-keys', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  })

  const listData = await listResponse.json()
  console.log('Response status:', listResponse.status)
  console.log('Response data:', JSON.stringify(listData, null, 2))

  // Test creating an API key
  console.log('\n🔑 Testing POST /auth-api-keys...')
  const createResponse = await fetch('https://service.hawkingedison.com/functions/v1/auth-api-keys', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Test API Key',
      expiresInDays: 30
    })
  })

  const createData = await createResponse.json()
  console.log('Response status:', createResponse.status)
  console.log('Response data:', JSON.stringify(createData, null, 2))

  // Sign out
  await supabase.auth.signOut()
  console.log('\n👋 Signed out')
}

testApiKeys().catch(console.error)