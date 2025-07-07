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

// Fixed test user that already exists
const TEST_USER = {
  email: 'test@hawkingedison.com',
  password: 'TestUser123!@#',
  userId: '0b9fcefa-ba51-470b-b787-5a41f329be25',
  apiKey: 'hke_test_b5a3d2f84c9e12a76b3f9d8e5a2c1b0f3e8d7c6a'
}

async function saveTestCredentials() {
  console.log('💾 Saving test credentials for automated testing...\n')

  try {
    // Step 1: Save test user credentials
    console.log('1️⃣ Saving test user credentials...')
    const testUserPath = join(__dirname, '..', '.test-user.json')
    const testUserData = {
      email: TEST_USER.email,
      password: TEST_USER.password,
      userId: TEST_USER.userId,
      apiKey: TEST_USER.apiKey,
      supabaseUrl: supabaseUrl,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      note: 'This is the dedicated test user for automated testing. Do not delete.',
      createdAt: new Date().toISOString()
    }

    fs.writeFileSync(testUserPath, JSON.stringify(testUserData, null, 2))
    console.log('✅ Saved to .test-user.json')

    // Step 2: Update CLAUDE.md with test user info
    console.log('\n2️⃣ Updating CLAUDE.md with test user info...')
    const claudeMdPath = join(__dirname, '..', 'CLAUDE.md')
    let claudeMdContent = fs.readFileSync(claudeMdPath, 'utf-8')
    
    // Remove old test user section if it exists
    claudeMdContent = claudeMdContent.replace(/\n### Test User for Automated Testing[\s\S]*?Use this for all automated testing to avoid email rate limits\./g, '')
    
    const testUserSection = `

### Test User for Automated Testing

A dedicated test user is available for all automated tests:

\`\`\`json
{
  "email": "${TEST_USER.email}",
  "password": "${TEST_USER.password}",
  "userId": "${TEST_USER.userId}",
  "apiKey": "Create via API key management page"
}
\`\`\`

**To create an API key for this user:**
1. Sign in as test@hawkingedison.com
2. Go to /api-keys
3. Create a new API key named "Automated Testing"
4. Update .test-user.json with the key

This user is stored in \`.test-user.json\` (git-ignored).
Use this for all automated testing to avoid email rate limits.`

    fs.writeFileSync(claudeMdPath, claudeMdContent + testUserSection)
    console.log('✅ Updated CLAUDE.md')

    // Step 3: Add .test-user.json to .gitignore
    console.log('\n3️⃣ Adding .test-user.json to .gitignore...')
    const gitignorePath = join(__dirname, '..', '.gitignore')
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8')
    
    if (!gitignoreContent.includes('.test-user.json')) {
      fs.writeFileSync(gitignorePath, gitignoreContent + '\n# Test user credentials\n.test-user.json\n')
      console.log('✅ Updated .gitignore')
    }

    console.log('\n✅ Test credentials setup complete!')
    console.log('\n📋 Test User Summary:')
    console.log('   Email:', TEST_USER.email)
    console.log('   Password:', TEST_USER.password)
    console.log('   User ID:', TEST_USER.userId)
    console.log('\n⚠️  Note: You need to manually create an API key for this user')
    console.log('   1. Sign in at https://hawking-edison.vercel.app')
    console.log('   2. Go to /api-keys')
    console.log('   3. Create key named "Automated Testing"')
    console.log('   4. Update .test-user.json with the key')

    // Step 4: Create helper to load test credentials
    const helperContent = `import * as fs from 'fs'
import { join } from 'path'

export interface TestUser {
  email: string
  password: string
  userId: string
  apiKey: string
  supabaseUrl: string
  supabaseAnonKey: string
}

export function getTestUser(): TestUser {
  const testUserPath = join(process.cwd(), '.test-user.json')
  if (!fs.existsSync(testUserPath)) {
    throw new Error('Test user not found. Run: npx tsx utils/setup-test-credentials.ts')
  }
  return JSON.parse(fs.readFileSync(testUserPath, 'utf-8'))
}
`

    const helperPath = join(__dirname, '..', 'src', 'lib', 'test-user.ts')
    fs.writeFileSync(helperPath, helperContent)
    console.log('\n✅ Created test user helper at src/lib/test-user.ts')

  } catch (error) {
    console.error('\n❌ Setup failed:', error)
  }
}

// Run the setup
saveTestCredentials()