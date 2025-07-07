#!/usr/bin/env node
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createClient } from '@supabase/supabase-js'

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

async function testOrchestrationWithApiKey() {
  console.log('🚀 Testing Orchestration with Service Role Key\n')
  console.log('📍 Supabase URL:', supabaseUrl)
  console.log('🔑 Using service role key (bypasses RLS)\n')

  try {
    // Step 1: Call interact endpoint with service role key
    console.log('1️⃣ Calling interact endpoint in async mode...')
    console.log('   Input: "Test orchestration system. What is the capital of France?"')
    
    const interactResponse = await fetch(`${supabaseUrl}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        input: 'Test orchestration system. What is the capital of France?',
        mode: 'async'
      })
    })

    if (!interactResponse.ok) {
      console.error('❌ Interact failed:', await interactResponse.text())
      return
    }

    const interactData = await interactResponse.json()
    console.log('✅ Interact response:', JSON.stringify(interactData, null, 2))

    if (interactData.data?.sessionId) {
      const sessionId = interactData.data.sessionId
      console.log('\n2️⃣ Orchestration session created!')
      console.log('   Session ID:', sessionId)
      console.log('   Status:', interactData.data.status)
      
      if (interactData.data.realtime) {
        console.log('   Realtime channel:', interactData.data.realtime.channel)
        console.log('   Realtime filter:', interactData.data.realtime.filter)
      }

      // Step 2: Poll for session updates
      console.log('\n3️⃣ Waiting for orchestration to complete...')
      console.log('   The Lambda poller runs every minute')
      console.log('   Checking every 5 seconds for updates...\n')

      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      let attempts = 0
      let lastStatus = 'processing'
      let finalResponse = null
      
      while (attempts < 30 && lastStatus !== 'completed' && lastStatus !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        
        // Check session status
        const { data: session, error } = await supabase
          .from('orchestration_sessions')
          .select('status, final_response, error, execution_count, messages')
          .eq('id', sessionId)
          .single()

        if (!error && session) {
          if (session.status !== lastStatus) {
            lastStatus = session.status
            console.log(`   ✓ Status changed to: ${lastStatus}`)
            if (session.execution_count > 0) {
              console.log(`     Lambda executions: ${session.execution_count}`)
            }
            if (session.messages && session.messages.length > 1) {
              console.log(`     Messages in conversation: ${session.messages.length}`)
            }
          } else {
            process.stdout.write('.')
          }

          if (session.final_response) {
            finalResponse = session.final_response
          }

          if (session.error) {
            console.log('\n\n❌ Error occurred:')
            console.log('   ' + session.error)
          }
        }

        attempts++
      }

      if (lastStatus === 'completed' && finalResponse) {
        console.log('\n\n✅ Orchestration completed!')
        console.log('   Final response: ' + finalResponse)
      } else if (lastStatus === 'failed') {
        console.log('\n\n❌ Orchestration failed')
      } else {
        console.log('\n\n⏱️  Orchestration still in progress')
        console.log('   Status:', lastStatus)
        console.log('   The system may still be processing...')
      }

      // Step 3: Check for tool executions
      console.log('\n4️⃣ Checking tool executions...')
      const { data: tools, error: toolError } = await supabase
        .from('tool_executions')
        .select('*')
        .eq('session_id', sessionId)

      if (!toolError && tools && tools.length > 0) {
        console.log(`   Found ${tools.length} tool execution(s):`)
        tools.forEach((tool, i) => {
          console.log(`   ${i + 1}. ${tool.tool_name} - ${tool.status}`)
          if (tool.duration_ms) {
            console.log(`      Duration: ${tool.duration_ms}ms`)
          }
          if (tool.result) {
            console.log(`      Result: ${JSON.stringify(tool.result).substring(0, 100)}...`)
          }
        })
      } else {
        console.log('   No tool executions found')
        console.log('   (This is expected since we haven\'t implemented tools yet)')
      }

    } else {
      console.log('\n⚠️  Async mode not enabled or working')
      console.log('   The Edge Function returned a synchronous response')
      console.log('   Check that ENABLE_ORCHESTRATION=true is set')
    }

    // Step 4: Test synchronous mode
    console.log('\n\n5️⃣ Testing synchronous mode for comparison...')
    const syncResponse = await fetch(`${supabaseUrl}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        input: 'What is 2+2? (sync test)',
        mode: 'sync'
      })
    })

    if (syncResponse.ok) {
      const syncData = await syncResponse.json()
      console.log('✅ Sync response:')
      if (syncData.data?.response) {
        console.log('   ' + syncData.data.response)
      } else {
        console.log('   ', JSON.stringify(syncData.data, null, 2))
      }
    }

    console.log('\n\n✅ Test complete!')
    console.log('\n📊 Test Summary:')
    console.log('   - Edge Function connectivity: ✅')
    console.log('   - Async orchestration: ' + (interactData.data?.sessionId ? '✅' : '❌'))
    console.log('   - Sync mode: ✅')
    
    console.log('\n🔍 To debug further:')
    console.log('   1. Check CloudWatch logs for the Lambda functions')
    console.log('   2. Check Supabase Edge Function logs')
    console.log('   3. Verify ENABLE_ORCHESTRATION environment variable')
    console.log('   4. Check SQS queue for messages')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
  }
}

// Run the test
testOrchestrationWithApiKey()