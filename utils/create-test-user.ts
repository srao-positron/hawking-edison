#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import * as fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment')
  process.exit(1)
}

// Test user credentials
const TEST_USER = {
  email: 'test@hawkingedison.com',
  password: 'TestUser123!@#',
  id: '', // Will be filled after creation
  apiKey: '' // Will be filled after creation
}

async function createTestUser() {
  console.log('🔧 Creating dedicated test user for automated testing...\n')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Step 1: Check if test user already exists
    console.log('1️⃣ Checking if test user exists...')
    const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.find(u => u.email === TEST_USER.email)
    
    if (existingUser) {
      console.log('✅ Test user already exists')
      TEST_USER.id = existingUser.id
    } else {
      // Create new test user
      console.log('   Creating new test user...')
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: 'Automated Test User',
          is_test_user: true
        }
      })

      if (createError) {
        console.error('❌ Failed to create test user:', createError)
        return
      }

      TEST_USER.id = newUser.user!.id
      console.log('✅ Test user created')
      console.log('   User ID:', TEST_USER.id)
    }

    // Step 2: Create API key for test user
    console.log('\n2️⃣ Creating API key for test user...')
    
    // Generate API key
    const keyPrefix = 'hke_test_'
    const randomBytes = new Uint8Array(24)
    crypto.getRandomValues(randomBytes)
    const apiKey = keyPrefix + Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('')
    
    // Hash the API key
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Check if test API key already exists
    const { data: existingKeys } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', TEST_USER.id)
      .eq('name', 'Automated Testing')
      .single()

    if (existingKeys) {
      console.log('   Deleting existing test API key...')
      await supabase
        .from('api_keys')
        .delete()
        .eq('id', existingKeys.id)
    }

    // Create new API key
    const { error: keyError } = await supabase
      .from('api_keys')
      .insert({
        user_id: TEST_USER.id,
        name: 'Automated Testing',
        key_prefix: apiKey.substring(0, 11), // "hke_test_"
        key_hash: keyHash,
        expires_at: null, // Never expires
        permissions: []
      })
      .select()
      .single()

    if (keyError) {
      console.error('❌ Failed to create API key:', keyError)
      return
    }

    TEST_USER.apiKey = apiKey
    console.log('✅ API key created')

    // Step 3: Save test user credentials
    console.log('\n3️⃣ Saving test user credentials...')
    const testUserPath = join(__dirname, '..', '.test-user.json')
    const testUserData = {
      email: TEST_USER.email,
      password: TEST_USER.password,
      userId: TEST_USER.id,
      apiKey: TEST_USER.apiKey,
      supabaseUrl: supabaseUrl,
      note: 'This is the dedicated test user for automated testing. Do not delete.',
      createdAt: new Date().toISOString()
    }

    fs.writeFileSync(testUserPath, JSON.stringify(testUserData, null, 2))
    console.log('✅ Saved to .test-user.json')

    // Step 4: Update CLAUDE.md with test user info
    console.log('\n4️⃣ Updating CLAUDE.md with test user info...')
    const claudeMdPath = join(__dirname, '..', 'CLAUDE.md')
    const claudeMdContent = fs.readFileSync(claudeMdPath, 'utf-8')
    
    const testUserSection = `

### Test User for Automated Testing

A dedicated test user is available for all automated tests:

\`\`\`json
{
  "email": "${TEST_USER.email}",
  "password": "${TEST_USER.password}",
  "userId": "${TEST_USER.id}",
  "apiKey": "${TEST_USER.apiKey}"
}
\`\`\`

This user is created by \`utils/create-test-user.ts\` and stored in \`.test-user.json\`.
Use this for all automated testing to avoid email rate limits.`

    if (!claudeMdContent.includes('Test User for Automated Testing')) {
      fs.writeFileSync(claudeMdPath, claudeMdContent + testUserSection)
      console.log('✅ Updated CLAUDE.md')
    }

    // Step 5: Add .test-user.json to .gitignore
    console.log('\n5️⃣ Adding .test-user.json to .gitignore...')
    const gitignorePath = join(__dirname, '..', '.gitignore')
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8')
    
    if (!gitignoreContent.includes('.test-user.json')) {
      fs.writeFileSync(gitignorePath, gitignoreContent + '\n# Test user credentials\n.test-user.json\n')
      console.log('✅ Updated .gitignore')
    }

    console.log('\n✅ Test user setup complete!')
    console.log('\n📋 Test User Summary:')
    console.log('   Email:', TEST_USER.email)
    console.log('   Password:', TEST_USER.password)
    console.log('   User ID:', TEST_USER.id)
    console.log('   API Key:', TEST_USER.apiKey)
    console.log('\n💡 Use these credentials in automated tests')
    console.log('   Credentials saved to: .test-user.json')

  } catch (error) {
    console.error('\n❌ Setup failed:', error)
  }
}

// Run the setup
createTestUser()