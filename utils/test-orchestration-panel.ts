#!/usr/bin/env tsx
/**
 * Test the improved orchestration panel with agent events
 * 
 * This creates a test orchestration that will generate agent events
 * to verify the panel displays thoughts and discussions properly.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Test user credentials
const TEST_EMAIL = 'test@hawkingedison.com'
const TEST_PASSWORD = 'TestUser123!@#'

async function testOrchestrationPanel() {
  console.log('🚀 Testing Orchestration Panel with Agent Events...\n')

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Sign in as test user
  console.log('📝 Signing in as test user...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  if (authError) {
    console.error('❌ Authentication failed:', authError.message)
    process.exit(1)
  }

  console.log('✅ Authenticated successfully')
  console.log('   User ID:', authData.user.id)

  // Create test input that will trigger agent creation and discussion
  const testInput = `Create three experts to discuss: "What are the key considerations for building a secure authentication system?"
  
  The experts should be:
  1. A security architect with 15 years experience
  2. A DevOps engineer focused on infrastructure
  3. A frontend developer concerned with UX
  
  Have them discuss for 2 rounds, then summarize their key points.`

  console.log('\n📨 Sending test request that will generate agent events...')
  console.log('   Input:', testInput.substring(0, 100) + '...')

  // Call the interact API
  const { data: interactData, error: interactError } = await supabase.functions.invoke('interact', {
    body: { input: testInput }
  })

  if (interactError) {
    console.error('❌ Interact API failed:', interactError.message)
    process.exit(1)
  }

  console.log('✅ Orchestration started')
  console.log('   Session ID:', interactData.sessionId)
  console.log('   Thread ID:', interactData.threadId)

  // Instructions for viewing the panel
  console.log('\n📋 To test the improved orchestration panel:')
  console.log('   1. Open http://localhost:3000 in your browser')
  console.log('   2. Sign in with:', TEST_EMAIL)
  console.log('   3. Navigate to the thread')
  console.log('   4. Click the ℹ️ button next to the message')
  console.log('   5. The panel should show:')
  console.log('      - Status updates')
  console.log('      - Tool calls')
  console.log('      - Agent creation events')
  console.log('      - Agent thoughts and reasoning')
  console.log('      - Discussion turns between agents')
  console.log('      - Timeline of all events')

  console.log('\n🔍 Expected Panel Sections:')
  console.log('   - Status: Should show "Running" then "Completed"')
  console.log('   - Tools: Count of tools called (createAgent, runDiscussion, etc.)')
  console.log('   - Agents (3): Should show the three experts with their thoughts')
  console.log('   - Discussions (1): Should show the authentication discussion')
  console.log('   - Timeline: All events in reverse chronological order')

  console.log('\n✨ The panel now displays:')
  console.log('   - Agent internal thoughts as they process')
  console.log('   - Key decisions highlighted in blue')
  console.log('   - Full discussion threads between agents')
  console.log('   - Clean, minimal UI matching the screenshot')

  // Sign out
  await supabase.auth.signOut()
  console.log('\n✅ Test setup complete!')
}

// Run the test
testOrchestrationPanel().catch(console.error)