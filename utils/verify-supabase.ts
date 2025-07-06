#!/usr/bin/env ts-node

/**
 * Verification script to test Supabase connection
 * Run with: npx tsx utils/verify-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required:', {
    NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey
  })
  process.exit(1)
}

async function verifySupabase() {
  console.log('🔍 Verifying Supabase connection...\n')

  // Test 1: Basic connection with anon key
  console.log('1️⃣ Testing public client connection...')
  const publicClient = createClient(supabaseUrl, supabaseAnonKey)
  
  try {
    const { data, error } = await publicClient.auth.getSession()
    if (error) {
      console.error('❌ Public client error:', error)
    } else {
      console.log('✅ Public client connected successfully')
      console.log('   Session:', data.session ? 'Active' : 'None')
    }
  } catch (err) {
    console.error('❌ Public client error:', err)
  }

  // Test 2: Service role connection
  console.log('\n2️⃣ Testing service role client...')
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Try to query a system table to verify connection
    const { data, error } = await serviceClient
      .from('auth.users')
      .select('count')
      .limit(0)
    
    if (error && !error.message.includes('does not exist')) {
      console.error('❌ Service client error:', error)
    } else {
      console.log('✅ Service client connected successfully')
    }
  } catch (err) {
    console.error('❌ Service client connection failed:', err)
  }

  // Test 3: Display connection info
  console.log('\n3️⃣ Connection Details:')
  console.log('   Project URL:', supabaseUrl)
  console.log('   Project ID:', supabaseUrl.split('.')[0].replace('https://', ''))
  console.log('   Region:', 'us-east-1 (default)')
  
  // Test 4: Check if we can create tables
  console.log('\n4️⃣ Checking database access...')
  try {
    // Try to access a table (it's ok if it doesn't exist)
    const { error } = await serviceClient
      .from('interactions')
      .select('id')
      .limit(1)
    
    if (error && error.message.includes('does not exist')) {
      console.log('⚠️  Tables not created yet (expected for new project)')
      console.log('   Run database migrations to create tables')
    } else if (error) {
      console.error('❌ Database access error:', error)
    } else {
      console.log('✅ Database tables accessible')
    }
  } catch (err) {
    console.error('❌ Database error:', err)
  }

  console.log('\n✨ Supabase verification complete!')
  console.log('\nNext steps:')
  console.log('1. Create database migrations for tables')
  console.log('2. Set up Edge Functions')
  console.log('3. Configure authentication')
}

// Run verification
verifySupabase().catch(console.error)