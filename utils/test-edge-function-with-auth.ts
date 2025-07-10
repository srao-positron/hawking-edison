#!/usr/bin/env npx tsx
// Test Edge Function deployment with proper authentication

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const EDGE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_EDGE_FUNCTIONS_URL || SUPABASE_URL

async function testWithAuth() {
  console.log('🔍 Testing Edge Function with authentication...\n')
  
  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  // Sign in with test user
  console.log('🔐 Signing in with test user...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@hawkingedison.com',
    password: 'TestUser123!@#'
  })
  
  if (authError) {
    console.error('❌ Authentication failed:', authError)
    return
  }
  
  console.log('✅ Authenticated successfully')
  console.log(`👤 User ID: ${authData.user.id}`)
  console.log(`🎫 Session token: ${authData.session.access_token.substring(0, 20)}...`)
  
  // Test Edge Function with session token
  const testInput = 'Hello, can you help me test the system?'
  
  try {
    console.log(`\n📡 Calling Edge Function at: ${EDGE_FUNCTIONS_URL}/functions/v1/interact`)
    console.log(`📝 Test input: "${testInput}"`)
    
    const response = await fetch(`${EDGE_FUNCTIONS_URL}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: testInput,
        mode: 'async'
      })
    })
    
    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`)
    
    const responseText = await response.text()
    console.log(`📄 Raw Response: ${responseText}`)
    
    try {
      const data = JSON.parse(responseText)
      console.log('\n✅ Parsed Response:', JSON.stringify(data, null, 2))
      
      if (data.success === false || data.error) {
        console.error('\n❌ Error in response:', data.error || data)
        
        // Check for specific error patterns
        if (data.error?.message?.includes('SNS')) {
          console.error('\n🚨 AWS SNS Issue Detected!')
          console.error('The Edge Function cannot publish to AWS SNS.')
          console.error('\nThis means:')
          console.error('1. AWS credentials are not configured in Edge Function environment')
          console.error('2. OR SNS topic ARN is not set')
          console.error('3. OR IAM permissions are insufficient')
          console.error('\nTo fix:')
          console.error('1. Check Supabase Dashboard > Edge Functions > Secrets')
          console.error('2. Ensure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SNS_TOPIC_ARN are set')
        }
        
        if (data.error?.message?.includes('orchestration session')) {
          console.error('\n🚨 Database Issue Detected!')
          console.error('Cannot create orchestration session in database.')
          console.error('Check if orchestration_sessions table exists')
        }
        
        if (data.error?.message?.includes('Failed to initiate processing')) {
          console.error('\n🚨 Async Processing Issue!')
          console.error('The system is configured for async processing but cannot start it.')
          console.error('This is likely due to missing AWS configuration.')
        }
      } else if (data.async && data.sessionId) {
        console.log('\n✅ Async processing initiated successfully!')
        console.log(`📋 Session ID: ${data.sessionId}`)
        console.log(`🔄 Status: ${data.status}`)
        console.log('✨ The system is working correctly!')
      } else if (data.response) {
        console.log('\n⚠️  Received synchronous response (this should not happen)')
        console.log('Response:', data.response)
      } else {
        console.warn('\n⚠️  Unexpected response format')
      }
    } catch (parseError) {
      console.error('\n❌ Failed to parse response as JSON')
      console.error('Response might be HTML or plain text')
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error)
  } finally {
    // Sign out
    await supabase.auth.signOut()
    console.log('\n👋 Signed out')
  }
}

// Run the test
testWithAuth().catch(console.error)