#!/usr/bin/env npx tsx
/**
 * Test script for realtime chat features
 * 
 * Usage:
 *   npx tsx utils/test-realtime-chat.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
import * as fs from 'fs'

// Load environment
dotenv.config({ path: resolve(__dirname, '../.env.local') })

// Load test user
const testUserPath = resolve(__dirname, '../.test-user.json')
if (!fs.existsSync(testUserPath)) {
  console.error('❌ Test user file not found. Please run: npx tsx utils/create-test-user.ts')
  process.exit(1)
}

const TEST_USER = JSON.parse(fs.readFileSync(testUserPath, 'utf-8'))

async function testRealtimeChat() {
  console.log('🔍 Testing Realtime Chat Features\n')

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL not set')
    process.exit(1)
  }

  // Test 1: Check interact-stream endpoint
  console.log('1️⃣ Testing interact-stream endpoint...')
  try {
    const response = await fetch(`${baseUrl}/functions/v1/interact-stream`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000'
      }
    })
    
    if (response.ok) {
      console.log('✅ interact-stream endpoint is accessible')
    } else {
      console.log(`❌ interact-stream endpoint returned ${response.status}`)
    }
  } catch (error) {
    console.log('❌ Failed to reach interact-stream endpoint:', error)
  }

  // Test 2: Check threads endpoint
  console.log('\n2️⃣ Testing threads endpoint...')
  try {
    const response = await fetch(`${baseUrl}/functions/v1/threads`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000'
      }
    })
    
    if (response.ok) {
      console.log('✅ threads endpoint is accessible')
    } else {
      console.log(`❌ threads endpoint returned ${response.status}`)
    }
  } catch (error) {
    console.log('❌ Failed to reach threads endpoint:', error)
  }

  // Test 3: Check database tables
  console.log('\n3️⃣ Checking database tables...')
  const requiredTables = [
    'threads',
    'messages', 
    'agent_conversations',
    'visualizations',
    'llm_thoughts',
    'tool_executions',
    'orchestration_sessions'
  ]

  console.log('Required tables:')
  requiredTables.forEach(table => {
    console.log(`  - ${table}`)
  })
  console.log('\nNote: Run migrations if any tables are missing:')
  console.log('  supabase db push')

  // Test 4: Check UI routes
  console.log('\n4️⃣ Checking UI routes...')
  const routes = [
    '/chat',
    '/chat-v2',
    '/auth/login',
    '/settings/api-keys'
  ]

  console.log('Available routes:')
  routes.forEach(route => {
    console.log(`  - http://localhost:3000${route}`)
  })

  // Summary
  console.log('\n📋 Summary:')
  console.log('1. Start the dev server: npm run dev')
  console.log('2. Login with test user:', TEST_USER.email)
  console.log('3. Navigate to http://localhost:3000/chat-v2')
  console.log('4. Test the following features:')
  console.log('   - Two-panel layout (toggle with button or Cmd/Ctrl+\\)')
  console.log('   - Send messages and watch streaming responses')
  console.log('   - Check thinking process visualization')
  console.log('   - Open right panel to see tool outputs')
  console.log('   - Create multiple threads and switch between them')
  console.log('\n5. Run E2E tests: npm run test:e2e:local -- realtime-chat.spec.ts')
}

// Run the test
testRealtimeChat().catch(console.error)