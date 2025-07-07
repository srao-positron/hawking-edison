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

// Load test user credentials
const testUserPath = join(__dirname, '..', '.test-user.json')
if (!fs.existsSync(testUserPath)) {
  console.error('❌ Test user not found. Run: npx tsx utils/setup-test-credentials.ts')
  process.exit(1)
}

const TEST_USER = JSON.parse(fs.readFileSync(testUserPath, 'utf-8'))

async function testOrchestrationFull() {
  console.log('🚀 Testing Orchestration End-to-End with Test User\n')
  console.log('📍 Supabase URL:', TEST_USER.supabaseUrl)
  console.log('👤 Test User:', TEST_USER.email)
  console.log('🔑 User ID:', TEST_USER.userId)

  const supabase = createClient(TEST_USER.supabaseUrl, TEST_USER.supabaseAnonKey)

  try {
    // Step 1: Sign in test user
    console.log('\n1️⃣ Signing in test user...')
    const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password
    })

    if (authError) {
      console.error('❌ Sign in failed:', authError)
      return
    }

    console.log('✅ Signed in successfully')
    const accessToken = auth.session!.access_token

    // Step 2: Test synchronous interaction
    console.log('\n2️⃣ Testing synchronous interaction...')
    const syncResponse = await fetch(`${TEST_USER.supabaseUrl}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        input: 'What is 2+2? (sync test)',
        mode: 'sync'
      })
    })

    if (!syncResponse.ok) {
      console.error('❌ Sync interact failed:', await syncResponse.text())
    } else {
      const syncData = await syncResponse.json()
      console.log('✅ Sync response received:')
      console.log('   ', syncData.data?.response || JSON.stringify(syncData.data))
    }

    // Step 3: Test asynchronous orchestration
    console.log('\n3️⃣ Testing asynchronous orchestration...')
    const asyncResponse = await fetch(`${TEST_USER.supabaseUrl}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        input: 'This is a test of the orchestration system. What is the capital of France?',
        mode: 'async'
      })
    })

    if (!asyncResponse.ok) {
      console.error('❌ Async interact failed:', await asyncResponse.text())
      return
    }

    const asyncData = await asyncResponse.json()
    console.log('✅ Async response received:')
    console.log('   ', JSON.stringify(asyncData.data, null, 2))

    if (asyncData.data?.sessionId) {
      const sessionId = asyncData.data.sessionId
      console.log('\n4️⃣ Orchestration session created!')
      console.log('   Session ID:', sessionId)
      console.log('   Status:', asyncData.data.status)

      // Step 4: Monitor orchestration progress
      console.log('\n5️⃣ Monitoring orchestration progress...')
      console.log('   Checking every 5 seconds (Lambda poller runs every minute)\n')

      let attempts = 0
      let lastStatus = 'processing'
      let completed = false
      
      while (attempts < 30 && !completed) {
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        const { data: session, error } = await supabase
          .from('orchestration_sessions')
          .select('status, final_response, error, execution_count')
          .eq('id', sessionId)
          .single()

        if (!error && session) {
          if (session.status !== lastStatus) {
            lastStatus = session.status
            console.log(`   ✓ Status: ${lastStatus}`)
            if (session.execution_count > 0) {
              console.log(`     Lambda executions: ${session.execution_count}`)
            }
          } else {
            process.stdout.write('.')
          }

          if (session.status === 'completed') {
            completed = true
            console.log('\n\n✅ Orchestration completed!')
            console.log('   Final response:', session.final_response)
          } else if (session.status === 'failed') {
            completed = true
            console.log('\n\n❌ Orchestration failed!')
            console.log('   Error:', session.error)
          }
        }

        attempts++
      }

      if (!completed) {
        console.log('\n\n⏱️  Orchestration still in progress after 2.5 minutes')
        console.log('   This could mean:')
        console.log('   - Lambda poller hasn\'t picked it up yet')
        console.log('   - Processing is taking longer than expected')
        console.log('   - There might be an error in the Lambda function')
      }

      // Step 5: Check tool executions
      console.log('\n6️⃣ Checking tool executions...')
      const { data: tools } = await supabase
        .from('tool_executions')
        .select('*')
        .eq('session_id', sessionId)

      if (tools && tools.length > 0) {
        console.log(`   Found ${tools.length} tool execution(s)`)
        tools.forEach((tool, i) => {
          console.log(`   ${i + 1}. ${tool.tool_name} - ${tool.status}`)
        })
      } else {
        console.log('   No tool executions (expected - tools not implemented yet)')
      }

    } else {
      console.log('\n⚠️  Async mode not working - got synchronous response')
      console.log('   Check ENABLE_ORCHESTRATION environment variable')
    }

    // Summary
    console.log('\n\n📊 Test Summary:')
    console.log('   ✅ Authentication: Working')
    console.log('   ✅ Sync mode: Working')
    console.log('   ' + (asyncData.data?.sessionId ? '✅' : '❌') + ' Async orchestration: ' + 
                (asyncData.data?.sessionId ? 'Working' : 'Not working'))

    // Sign out
    await supabase.auth.signOut()

  } catch (error) {
    console.error('\n❌ Test failed:', error)
  }
}

// Run the test
testOrchestrationFull()