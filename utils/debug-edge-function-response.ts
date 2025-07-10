#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

async function debugEdgeFunction() {
  console.log('🔍 Debugging Edge Function Response...\n')

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // First, sign in with test user
  console.log('📝 Signing in with test user...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'siddhartha.s.rao@gmail.com',
    password: 'Ctigroup1@'
  })

  if (authError || !authData.session) {
    console.error('❌ Authentication failed:', authError)
    return
  }

  console.log('✅ Authenticated successfully')
  console.log('User ID:', authData.user.id)

  // Now call the Edge Function directly
  console.log('\n📤 Calling Edge Function directly...')
  
  const testPayload = {
    input: 'Hello, can you help me?',
    mode: 'sync',
    userId: authData.user.id
  }

  console.log('Request payload:', JSON.stringify(testPayload, null, 2))

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    })

    console.log('\n📥 Response Status:', response.status, response.statusText)
    console.log('Response Headers:')
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`)
    })

    // Get the response body as text first
    const responseText = await response.text()
    console.log('\n📄 Raw Response Body:')
    console.log(responseText)

    // Try to parse as JSON if possible
    if (responseText) {
      try {
        const responseJson = JSON.parse(responseText)
        console.log('\n📋 Parsed Response:')
        console.log(JSON.stringify(responseJson, null, 2))
      } catch (e) {
        console.log('(Response is not valid JSON)')
      }
    }

    // Also check the Edge Function logs
    console.log('\n📊 Fetching recent Edge Function logs...')
    
    // Query the edge_function_logs table
    const { data: logs, error: logsError } = await supabase
      .from('edge_function_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (logsError) {
      console.error('❌ Failed to fetch logs:', logsError)
    } else if (logs && logs.length > 0) {
      console.log('\nRecent Edge Function logs:')
      logs.forEach((log, index) => {
        console.log(`\n--- Log ${index + 1} ---`)
        console.log('Timestamp:', log.created_at)
        console.log('Function:', log.function_name)
        console.log('Status:', log.status_code)
        console.log('Request:', JSON.stringify(log.request_body, null, 2))
        console.log('Response:', JSON.stringify(log.response_body, null, 2))
        if (log.error) {
          console.log('Error:', JSON.stringify(log.error, null, 2))
        }
      })
    } else {
      console.log('No logs found in edge_function_logs table')
    }

  } catch (error) {
    console.error('❌ Request failed:', error)
  }

  // Sign out
  await supabase.auth.signOut()
}

debugEdgeFunction().catch(console.error)