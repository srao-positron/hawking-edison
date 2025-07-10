#!/usr/bin/env npx tsx
/**
 * Debug authentication flow
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })

async function debugAuth() {
  console.log('🔍 Debugging Authentication Flow\n')
  
  // Create a test client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  console.log('1. Testing direct Supabase authentication...')
  
  try {
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'siddhartha.s.rao@gmail.com',
      password: 'Ctigroup1@'
    })
    
    if (error) {
      console.error('❌ Login failed:', error.message)
      console.error('Error details:', error)
    } else {
      console.log('✅ Login successful!')
      console.log('User:', data.user?.email)
      console.log('Session:', data.session ? 'Present' : 'Missing')
      
      // Check session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      console.log('\n2. Session check:')
      console.log('Session exists:', sessionData.session ? 'Yes' : 'No')
      if (sessionError) {
        console.error('Session error:', sessionError)
      }
      
      // Check user
      const { data: userData, error: userError } = await supabase.auth.getUser()
      console.log('\n3. User check:')
      console.log('User exists:', userData.user ? 'Yes' : 'No')
      if (userError) {
        console.error('User error:', userError)
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err)
  }
  
  console.log('\n4. Environment check:')
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing')
  console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
}

debugAuth().catch(console.error)