#!/usr/bin/env npx tsx
/**
 * Test basic authentication setup
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })

async function testAuth() {
  console.log('🔍 Testing Basic Authentication\n')
  
  // 1. Create a standard Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  console.log('1️⃣ Testing with standard Supabase client...')
  
  // 2. Try to sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'siddhartha.s.rao@gmail.com',
    password: 'Ctigroup1@'
  })
  
  if (error) {
    console.error('❌ Login failed:', error.message)
    return
  }
  
  console.log('✅ Login successful!')
  console.log('   User:', data.user?.email)
  console.log('   Session:', data.session ? 'Present' : 'Missing')
  console.log('   Access Token:', data.session?.access_token ? 'Present' : 'Missing')
  
  // 3. Check if we can get the session
  const { data: sessionData } = await supabase.auth.getSession()
  console.log('\n2️⃣ Session check:')
  console.log('   Session exists:', sessionData.session ? 'Yes' : 'No')
  
  // 4. Check environment
  console.log('\n3️⃣ Environment:')
  console.log('   SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('   NODE_ENV:', process.env.NODE_ENV)
  
  // 5. Test SSR client
  console.log('\n4️⃣ Testing SSR client...')
  const { createBrowserClient } = await import('@supabase/ssr')
  const ssrClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data: ssrSession } = await ssrClient.auth.getSession()
  console.log('   SSR Session exists:', ssrSession.session ? 'Yes' : 'No')
}

testAuth().catch(console.error)