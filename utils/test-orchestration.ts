#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testOrchestration() {
  console.log('🔄 Testing orchestration infrastructure...\n')

  try {
    // 1. Create a test orchestration session
    console.log('1️⃣ Creating test orchestration session...')
    const { data: session, error: sessionError } = await supabase
      .from('orchestration_sessions')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Test user ID
        status: 'pending',
        messages: [{
          role: 'user',
          content: 'Test orchestration request'
        }]
      })
      .select()
      .single()

    if (sessionError) {
      console.error('❌ Failed to create session:', sessionError)
      return
    }

    console.log('✅ Created session:', session.id)
    console.log('   Status:', session.status)

    // 2. Wait a moment for poller to pick it up
    console.log('\n2️⃣ Waiting for poller to process (up to 2 minutes)...')
    
    let attempts = 0
    let currentStatus = 'pending'
    
    while (attempts < 24 && currentStatus !== 'completed' && currentStatus !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      
      const { data: updatedSession, error: fetchError } = await supabase
        .from('orchestration_sessions')
        .select('status, final_response, error')
        .eq('id', session.id)
        .single()

      if (fetchError) {
        console.error('❌ Failed to fetch session:', fetchError)
        return
      }

      if (updatedSession.status !== currentStatus) {
        currentStatus = updatedSession.status
        console.log(`   Status changed to: ${currentStatus}`)
      }

      attempts++
    }

    // 3. Check final status
    console.log('\n3️⃣ Final results:')
    const { data: finalSession, error: finalError } = await supabase
      .from('orchestration_sessions')
      .select('*')
      .eq('id', session.id)
      .single()

    if (finalError) {
      console.error('❌ Failed to fetch final session:', finalError)
      return
    }

    console.log('   Session ID:', finalSession.id)
    console.log('   Status:', finalSession.status)
    console.log('   Execution Count:', finalSession.execution_count)
    console.log('   Messages:', finalSession.messages.length)
    
    if (finalSession.final_response) {
      console.log('   Response:', finalSession.final_response)
    }
    
    if (finalSession.error) {
      console.log('   Error:', finalSession.error)
    }

    // 4. Check for tool executions
    const { data: toolExecutions, error: toolError } = await supabase
      .from('tool_executions')
      .select('*')
      .eq('session_id', session.id)

    if (!toolError && toolExecutions && toolExecutions.length > 0) {
      console.log('\n4️⃣ Tool executions:')
      toolExecutions.forEach((exec, i) => {
        console.log(`   ${i + 1}. ${exec.tool_name} - ${exec.status}`)
      })
    }

    // 5. Clean up test data
    console.log('\n5️⃣ Cleaning up test data...')
    await supabase
      .from('orchestration_sessions')
      .delete()
      .eq('id', session.id)

    console.log('✅ Test complete!')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
  }
}

// Run the test
testOrchestration()