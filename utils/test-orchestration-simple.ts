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
    // 1. Create a test orchestration session with a dummy user ID
    console.log('1️⃣ Creating test orchestration session...')
    const testUserId = 'a0000000-0000-0000-0000-000000000001' // Dummy UUID
    
    const { data: session, error: sessionError } = await supabase
      .from('orchestration_sessions')
      .insert({
        user_id: testUserId,
        status: 'pending',
        messages: [{
          role: 'user',
          content: 'Test orchestration request: What is 2+2?'
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
    console.log('   Messages:', JSON.stringify(session.messages))

    // 2. Wait a moment for poller to pick it up
    console.log('\n2️⃣ Waiting for poller to process (up to 2 minutes)...')
    console.log('   Note: The poller Lambda runs every minute\n')
    
    let attempts = 0
    let currentStatus = 'pending'
    
    while (attempts < 24 && currentStatus !== 'completed' && currentStatus !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      
      const { data: updatedSession, error: fetchError } = await supabase
        .from('orchestration_sessions')
        .select('status, final_response, error, execution_count')
        .eq('id', session.id)
        .single()

      if (fetchError) {
        console.error('❌ Failed to fetch session:', fetchError)
        return
      }

      if (updatedSession.status !== currentStatus) {
        currentStatus = updatedSession.status
        console.log(`   Status changed to: ${currentStatus}`)
        if (updatedSession.execution_count > 0) {
          console.log(`   Execution count: ${updatedSession.execution_count}`)
        }
      } else {
        process.stdout.write('.')
      }

      attempts++
    }

    // 3. Check final status
    console.log('\n\n3️⃣ Final results:')
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
      console.log('   ✅ Response:', finalSession.final_response)
    }
    
    if (finalSession.error) {
      console.log('   ❌ Error:', finalSession.error)
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
        if (exec.duration_ms) {
          console.log(`      Duration: ${exec.duration_ms}ms`)
        }
      })
    } else {
      console.log('\n4️⃣ No tool executions found')
    }

    // 5. Test that the interact Edge Function can create sessions
    console.log('\n5️⃣ Testing Edge Function orchestration mode...')
    const response = await fetch(`${supabaseUrl}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        input: 'Test from Edge Function: What is the capital of France?',
        mode: 'async'
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('   Edge Function response:', result)
      if (result.data?.sessionId) {
        console.log('   ✅ Async session created:', result.data.sessionId)
      }
    } else {
      console.log('   ❌ Edge Function error:', await response.text())
    }

    // 6. Clean up test data
    console.log('\n6️⃣ Cleaning up test data...')
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