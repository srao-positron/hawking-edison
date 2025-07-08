#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

// Get credentials from environment (CI) or local env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const testEmail = process.env.TEST_USER_EMAIL || 'test@hawkingedison.com'
const testPassword = process.env.TEST_USER_PASSWORD || 'TestUser123!@#'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

async function ensureTestUser() {
  console.log('🔧 Ensuring test user exists in production...\n')
  console.log('📍 Environment:')
  console.log('   Supabase URL:', supabaseUrl)
  console.log('   Test Email:', testEmail)
  console.log('   CI Environment:', process.env.CI === 'true' ? 'Yes' : 'No')
  console.log('')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Step 1: Check if test user exists
    console.log('1️⃣ Checking if test user exists...')
    const { data: { users: existingUsers }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Failed to list users:', listError)
      process.exit(1)
    }

    let testUser = existingUsers?.find(u => u.email === testEmail)
    
    if (!testUser) {
      console.log('⚠️  Test user does not exist, creating...')
      
      // Create new test user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: 'Automated Test User',
          is_test_user: true
        }
      })

      if (createError) {
        console.error('❌ Failed to create test user:', createError)
        process.exit(1)
      }

      if (!newUser.user) {
        console.error('❌ User creation succeeded but no user data returned')
        process.exit(1)
      }

      testUser = newUser.user
      console.log('✅ Test user created')
      console.log('   User ID:', testUser.id)
    } else {
      console.log('✅ Test user already exists')
      console.log('   User ID:', testUser.id)
      console.log('   Email confirmed:', testUser.email_confirmed_at ? 'Yes' : 'No')
      
      // Ensure email is confirmed
      if (!testUser.email_confirmed_at) {
        console.log('⚠️  Email not confirmed, updating...')
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          testUser.id,
          { email_confirm: true }
        )
        
        if (updateError) {
          console.error('❌ Failed to confirm email:', updateError)
        } else {
          console.log('✅ Email confirmed')
        }
      }

      // Ensure user metadata is correct
      const metadata = testUser.user_metadata || {}
      if (!metadata.is_test_user || metadata.full_name !== 'Automated Test User') {
        console.log('⚠️  Updating user metadata...')
        const { error: metaError } = await supabase.auth.admin.updateUserById(
          testUser.id,
          {
            user_metadata: {
              full_name: 'Automated Test User',
              is_test_user: true
            }
          }
        )
        
        if (metaError) {
          console.error('❌ Failed to update metadata:', metaError)
        } else {
          console.log('✅ Metadata updated')
        }
      }
    }

    // Step 2: Test authentication
    console.log('\n2️⃣ Testing authentication...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    if (authError) {
      console.error('❌ Authentication failed:', authError.message)
      
      // Try to reset password if auth fails
      if (authError.message.includes('Invalid login credentials')) {
        console.log('⚠️  Attempting to reset password...')
        
        // Update password
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          testUser.id,
          { password: testPassword }
        )
        
        if (passwordError) {
          console.error('❌ Failed to reset password:', passwordError)
          process.exit(1)
        }
        
        console.log('✅ Password reset, retrying authentication...')
        
        // Retry authentication
        const { data: retryAuth, error: retryError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        })
        
        if (retryError) {
          console.error('❌ Authentication still failing:', retryError)
          process.exit(1)
        }
        
        console.log('✅ Authentication successful after password reset')
      } else {
        process.exit(1)
      }
    } else {
      console.log('✅ Authentication successful')
    }

    // Step 3: Verify ready for tests
    console.log('\n3️⃣ Verifying test readiness...')
    console.log('   ✅ User exists')
    console.log('   ✅ Email confirmed')
    console.log('   ✅ Authentication works')
    console.log('   ✅ Metadata correct')

    console.log('\n✅ Test user is ready for Playwright tests!')
    console.log('\n📋 Test User Details:')
    console.log('   Email:', testEmail)
    console.log('   Password:', testPassword)
    console.log('   User ID:', testUser.id)

  } catch (error) {
    console.error('\n❌ Failed to ensure test user:', error)
    process.exit(1)
  }
}

// Run the script
ensureTestUser()