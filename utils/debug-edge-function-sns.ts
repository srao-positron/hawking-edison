#!/usr/bin/env tsx

/**
 * Debug Edge Function SNS publishing
 * This creates a minimal test endpoint to debug SNS issues
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function debugEdgeFunctionSNS() {
  console.log('🔍 Debugging Edge Function SNS Publishing...\n')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Test the debug endpoint we'll create
    console.log('1️⃣ Testing SNS debug endpoint...')
    
    const response = await fetch(`${supabaseUrl}/functions/v1/debug-sns`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        test: true,
        message: 'Debug test message'
      })
    })
    
    console.log(`   Response status: ${response.status}`)
    
    const result = await response.text()
    console.log('   Response:', result)
    
    if (response.ok) {
      try {
        const data = JSON.parse(result)
        console.log('\n📊 Debug Results:')
        console.log('   Credentials found:', data.hasCredentials ? '✅' : '❌')
        console.log('   SNS client created:', data.snsClientCreated ? '✅' : '❌')
        console.log('   Publish attempted:', data.publishAttempted ? '✅' : '❌')
        console.log('   Publish success:', data.publishSuccess ? '✅' : '❌')
        if (data.error) {
          console.log('   Error:', data.error)
        }
        if (data.messageId) {
          console.log('   SNS Message ID:', data.messageId)
        }
      } catch (e) {
        console.log('   Raw response:', result)
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the debug
debugEdgeFunctionSNS()