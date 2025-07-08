#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

async function debugCIAuth() {
  console.log('🔍 Debugging CI Authentication Issues\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const testEmail = process.env.TEST_USER_EMAIL || 'test@hawkingedison.com'
  const testPassword = process.env.TEST_USER_PASSWORD || 'TestUser123!@#'
  
  console.log('📋 Environment Check:')
  console.log('   Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.log('   Service Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing')
  console.log('   Test Email:', testEmail)
  console.log('   CI Mode:', process.env.CI === 'true' ? 'Yes' : 'No')
  console.log('')
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  try {
    // Check if test user exists
    console.log('1️⃣ Checking test user in database...')
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Failed to list users:', listError)
      process.exit(1)
    }
    
    const testUser = users?.find(u => u.email === testEmail)
    
    if (!testUser) {
      console.error('❌ Test user does NOT exist!')
      console.error('   Expected email:', testEmail)
      console.error('   Total users in DB:', users?.length || 0)
      
      // List first few users (redacted)
      if (users && users.length > 0) {
        console.error('\n   Sample of existing users:')
        users.slice(0, 5).forEach(u => {
          const email = u.email || 'no-email'
          const redacted = email.substring(0, 3) + '***@' + email.split('@')[1]
          console.error(`   - ${redacted} (created: ${u.created_at})`)
        })
      }
      
      console.error('\n💡 Solution: Run this command to create test user:')
      console.error('   npx tsx utils/ensure-test-user.ts')
      
      process.exit(1)
    }
    
    console.log('✅ Test user exists')
    console.log('   User ID:', testUser.id)
    console.log('   Email confirmed:', testUser.email_confirmed_at ? 'Yes' : 'No')
    console.log('   Last sign in:', testUser.last_sign_in_at || 'Never')
    
    // Try to authenticate
    console.log('\n2️⃣ Testing authentication...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })
    
    if (authError) {
      console.error('❌ Authentication FAILED!')
      console.error('   Error:', authError.message)
      console.error('   Code:', authError.code)
      
      if (authError.message.includes('Invalid login credentials')) {
        console.error('\n💡 Password mismatch! The password in CI secrets might be wrong.')
        console.error('   Expected password from env:', testPassword)
        console.error('\n   To fix: Update TEST_USER_PASSWORD in GitHub secrets')
      }
      
      process.exit(1)
    }
    
    console.log('✅ Authentication successful')
    console.log('   Session created:', !!authData.session)
    
    // Check production URL
    console.log('\n3️⃣ Checking production deployment...')
    const prodUrl = 'https://hawking-edison.vercel.app'
    
    try {
      const response = await fetch(prodUrl)
      console.log('   Production site status:', response.status)
      console.log('   Production site available:', response.ok ? '✅ Yes' : '❌ No')
      
      // Check auth endpoint
      const authResponse = await fetch(`${prodUrl}/auth/login`)
      console.log('   Auth page status:', authResponse.status)
      
    } catch (error) {
      console.error('❌ Cannot reach production site:', (error as Error).message)
    }
    
    console.log('\n📊 Summary:')
    console.log('   ✅ Test user exists in database')
    console.log('   ✅ Can authenticate with provided credentials')
    console.log('   ✅ Production site is accessible')
    console.log('\n   If tests still fail, check:')
    console.log('   - Browser console errors in test output')
    console.log('   - Network failures during test')
    console.log('   - Timing issues with page loads')
    
  } catch (error) {
    console.error('\n❌ Debug script failed:', error)
    process.exit(1)
  }
}

// Run debug
debugCIAuth()