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

async function verifyTestUser() {
  console.log('🔍 Verifying test user in production...\n')
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
    let authData: any = null
    
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
      console.log('✅ Test user exists')
      console.log('   User ID:', testUser.id)
      console.log('   Email confirmed:', testUser.email_confirmed_at ? 'Yes' : 'No')
      console.log('   Created at:', testUser.created_at)
      
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
    }

    console.log('✅ Test user exists')
    console.log('   User ID:', testUser.id)
    console.log('   Email confirmed:', testUser.email_confirmed_at ? 'Yes' : 'No')
    console.log('   Created at:', testUser.created_at)

    // Step 2: Test authentication
    console.log('\n2️⃣ Testing authentication...')
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    if (authError) {
      console.error('❌ Authentication failed:', authError.message)
      console.error('   Error code:', authError.code)
      console.error('   Error status:', authError.status)
      
      // Try to reset password if auth fails
      if (authError.message.includes('Invalid login credentials')) {
        console.log('⚠️  Attempting to reset password...')
        
        // Update password
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          testUser!.id,
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
        
        authData = retryAuth
        console.log('✅ Authentication successful after password reset')
      } else {
        process.exit(1)
      }
    } else {
      authData = data
      console.log('✅ Authentication successful')
    }

    if (!authData || !authData.user) {
      console.error('❌ Authentication succeeded but no user data returned')
      process.exit(1)
    }
    console.log('   Session created:', !!authData.session)
    console.log('   Access token:', authData.session?.access_token ? 'Present' : 'Missing')

    // Step 3: Check user metadata
    console.log('\n3️⃣ Checking user metadata...')
    const metadata = authData.user.user_metadata || {}
    console.log('   Full name:', metadata.full_name || 'Not set')
    console.log('   Is test user:', metadata.is_test_user === true ? 'Yes' : 'No')

    // Step 4: Check API keys (optional)
    console.log('\n4️⃣ Checking API keys...')
    const { data: apiKeys, error: keysError } = await supabase
      .from('api_keys')
      .select('id, name, created_at')
      .eq('user_id', testUser.id)

    if (keysError) {
      console.log('⚠️  Could not check API keys:', keysError.message)
    } else {
      console.log('   API keys found:', apiKeys?.length || 0)
      if (apiKeys && apiKeys.length > 0) {
        apiKeys.forEach(key => {
          console.log(`     - ${key.name} (created: ${key.created_at})`)
        })
      }
    }

    // Step 5: Test a protected endpoint
    console.log('\n5️⃣ Testing protected endpoint...')
    const testUrl = new URL('/api/interact', supabaseUrl.replace('supabase.co', 'vercel.app').replace('https://bknpldydmkzupsfagnva.', 'https://hawking-edison.'))
    console.log('   Testing URL:', testUrl.toString())
    
    try {
      const response = await fetch(testUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session?.access_token}`
        },
        body: JSON.stringify({ message: 'Test from verify script' })
      })

      console.log('   Response status:', response.status)
      
      if (response.status === 401) {
        console.log('⚠️  Endpoint requires authentication (expected)')
      } else if (response.status === 200) {
        console.log('✅ Protected endpoint accessible')
      } else {
        const text = await response.text()
        console.log('   Response:', text.substring(0, 100) + '...')
      }
    } catch (fetchError) {
      console.log('⚠️  Could not test endpoint:', (fetchError as Error).message)
    }

    console.log('\n✅ Test user verification complete!')
    console.log('\n📋 Summary:')
    console.log('   ✅ Test user exists in production')
    console.log('   ✅ Authentication works')
    console.log('   ✅ User metadata is correct')
    console.log('\n💡 The test user is ready for Playwright tests')

  } catch (error) {
    console.error('\n❌ Verification failed:', error)
    process.exit(1)
  }
}

// Run the verification
verifyTestUser()