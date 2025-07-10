#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js'
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

async function testDirectEdgeFunction() {
  console.log('🔍 Testing Direct Edge Function Call with supabase.functions.invoke...\n')

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

  // Test the interact function using supabase.functions.invoke
  console.log('\n📤 Testing interact function with supabase.functions.invoke...')
  
  const { data, error } = await supabase.functions.invoke('interact', {
    body: { 
      input: 'Hello, can you help me test this?',
      mode: 'sync'
    }
  })
  
  if (error) {
    console.error('\n❌ Edge Function error:')
    if (error instanceof FunctionsHttpError) {
      const errorMessage = await error.context.json()
      console.error('HTTP Error:', {
        status: error.context.status,
        statusText: error.context.statusText,
        error: errorMessage,
        headers: Object.fromEntries(error.context.headers.entries())
      })
    } else if (error instanceof FunctionsRelayError) {
      console.error('Relay error:', error.message)
    } else if (error instanceof FunctionsFetchError) {
      console.error('Fetch error:', error.message)
    } else {
      console.error('Unknown error:', error)
    }
    return
  }

  console.log('\n✅ Success! Response:')
  console.log(JSON.stringify(data, null, 2))

  // Test threads function
  console.log('\n📤 Testing chat-threads function...')
  
  const { data: threadsData, error: threadsError } = await supabase.functions.invoke('chat-threads', {
    body: { action: 'list', limit: 5, offset: 0 }
  })
  
  if (threadsError) {
    console.error('\n❌ Threads error:')
    if (threadsError instanceof FunctionsHttpError) {
      const errorMessage = await threadsError.context.json()
      console.error('HTTP Error:', errorMessage)
    } else {
      console.error('Error:', threadsError)
    }
  } else {
    console.log('\n✅ Threads response:')
    console.log(JSON.stringify(threadsData, null, 2))
  }

  // Sign out
  await supabase.auth.signOut()
}

testDirectEdgeFunction().catch(console.error)