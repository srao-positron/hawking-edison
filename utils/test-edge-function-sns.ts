#!/usr/bin/env tsx

/**
 * Test Edge Function SNS connectivity
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testEdgeFunctionSNS() {
  console.log('🧪 Testing Edge Function SNS connectivity...\n')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // First, check if we can get AWS credentials via RPC
    console.log('1️⃣ Testing RPC function get_aws_credentials...')
    const { data: creds, error: credsError } = await supabase.rpc('get_aws_credentials')
    
    if (credsError) {
      console.error('❌ RPC error:', credsError)
      return
    }
    
    console.log('✅ Got credentials:', {
      accessKeyId: creds?.accessKeyId,
      region: creds?.region,
      topicArn: creds?.topicArn,
      hasSecretKey: !!creds?.secretAccessKey
    })
    
    // Now test the interact endpoint with minimal auth
    console.log('\n2️⃣ Testing interact endpoint with service role...')
    
    const response = await fetch(`${supabaseUrl}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'x-supabase-user-id': '0b9fcefa-ba51-470b-b787-5a41f329be25' // Test user ID
      },
      body: JSON.stringify({
        input: 'Hello, this is a test message',
        mode: 'async'
      })
    })
    
    console.log(`   Response status: ${response.status}`)
    
    const responseText = await response.text()
    console.log(`   Response body: ${responseText}`)
    
    if (response.ok) {
      try {
        const result = JSON.parse(responseText)
        console.log('\n✅ Success! Response:', result)
      } catch (e) {
        console.log('\n✅ Got response (non-JSON):', responseText)
      }
    } else {
      console.error('\n❌ Request failed')
    }
    
    // Check orchestration sessions table
    console.log('\n3️⃣ Checking recent orchestration sessions...')
    const { data: sessions, error: sessionsError } = await supabase
      .from('orchestration_sessions')
      .select('id, status, created_at, error')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError)
    } else {
      console.log(`Found ${sessions.length} recent sessions:`)
      sessions.forEach(s => {
        console.log(`   ${s.id}: ${s.status} (${new Date(s.created_at).toLocaleString()})`)
        if (s.error) console.log(`     Error: ${s.error}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testEdgeFunctionSNS()