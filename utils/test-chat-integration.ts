#!/usr/bin/env tsx

/**
 * Test the complete chat integration flow
 * This ensures the Edge Functions connect properly to AWS Lambda orchestration
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Test user credentials
const testEmail = 'test@hawkingedison.com'
const testPassword = 'TestUser123!@#'

async function testChatIntegration() {
  console.log('🧪 Testing Chat Integration with AWS Orchestration...\n')
  
  try {
    // 1. Create authenticated client
    console.log('1️⃣ Authenticating test user...')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })
    
    if (authError) {
      console.error('❌ Authentication failed:', authError.message)
      return
    }
    
    console.log('✅ Authenticated successfully')
    console.log(`   User ID: ${authData.user?.id}`)
    
    // 2. Send a test message through the interact endpoint
    console.log('\n2️⃣ Sending test message...')
    const response = await fetch(`${supabaseUrl}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.session?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: 'Hello! Can you tell me what tools you have available?',
        mode: 'async'
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Request failed:', response.status, errorText)
      return
    }
    
    const result = await response.json()
    console.log('✅ Request accepted')
    console.log(`   Session ID: ${result.sessionId}`)
    console.log(`   Status: ${result.status}`)
    console.log(`   Async: ${result.async}`)
    
    // 3. Monitor the orchestration session
    if (result.sessionId) {
      console.log('\n3️⃣ Monitoring orchestration session...')
      
      // Create service client to check session status
      const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey)
      
      // Poll for updates (in production, use Realtime)
      let attempts = 0
      const maxAttempts = 30 // 30 seconds max
      
      while (attempts < maxAttempts) {
        const { data: session, error: sessionError } = await serviceSupabase
          .from('orchestration_sessions')
          .select('*')
          .eq('id', result.sessionId)
          .single()
        
        if (sessionError) {
          console.error('❌ Error checking session:', sessionError.message)
          break
        }
        
        console.log(`   Status: ${session.status}`)
        
        if (session.status === 'completed') {
          console.log('✅ Orchestration completed!')
          console.log(`   Response: ${session.final_response ? 'Available' : 'Not yet'}`)
          
          if (session.final_response) {
            const response = JSON.parse(session.final_response)
            console.log('\n📝 Final Response:')
            console.log(response.content || response)
          }
          break
        } else if (session.status === 'failed') {
          console.error('❌ Orchestration failed:', session.error)
          break
        }
        
        // Wait 1 second before checking again
        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
      }
      
      if (attempts >= maxAttempts) {
        console.log('⏱️ Timeout waiting for orchestration to complete')
        console.log('   The Lambda functions may not be processing messages')
      }
    }
    
    // 4. Sign out
    await supabase.auth.signOut()
    console.log('\n✅ Test complete')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testChatIntegration()