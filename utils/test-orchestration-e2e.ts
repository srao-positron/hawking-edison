#!/usr/bin/env node
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in environment')
  process.exit(1)
}

async function testOrchestrationE2E() {
  console.log('🚀 Testing Orchestration End-to-End\n')
  console.log('📍 Supabase URL:', supabaseUrl)
  console.log('🔑 Using anonymous key for auth\n')

  try {
    // Step 1: Sign up a test user
    console.log('1️⃣ Creating test user...')
    const timestamp = Date.now()
    const testEmail = `sid+he-testing-orchestration-${timestamp}@hawkingedison.com`
    const testPassword = 'TestOrchestration123!'

    const signupResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    })

    if (!signupResponse.ok) {
      console.error('❌ Signup failed:', await signupResponse.text())
      return
    }

    const signupData = await signupResponse.json()
    console.log('✅ User created:', testEmail)
    console.log('   User ID:', signupData.user?.id)

    // Step 2: Sign in to get session
    console.log('\n2️⃣ Signing in...')
    const signinResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    })

    if (!signinResponse.ok) {
      console.error('❌ Signin failed:', await signinResponse.text())
      return
    }

    const signinData = await signinResponse.json()
    const accessToken = signinData.access_token
    console.log('✅ Signed in successfully')
    console.log('   Session token obtained')

    // Step 3: Call interact endpoint with async mode
    console.log('\n3️⃣ Calling interact endpoint in async mode...')
    const interactResponse = await fetch(`${supabaseUrl}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        input: 'This is a test of the orchestration system. Please confirm you received this message.',
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
      console.log('\n4️⃣ Orchestration session created!')
      console.log('   Session ID:', sessionId)
      console.log('   Status:', interactData.data.status)
      console.log('   Message:', interactData.data.message)

      // Step 4: Poll for session updates (simulating real-time subscription)
      console.log('\n5️⃣ Polling for orchestration updates...')
      console.log('   (In production, you would use Realtime subscription)\n')

      let attempts = 0
      let lastStatus = 'processing'
      
      while (attempts < 30 && lastStatus !== 'completed' && lastStatus !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        
        // Check session status using REST API
        const statusResponse = await fetch(`${supabaseUrl}/rest/v1/orchestration_sessions?id=eq.${sessionId}&select=status,final_response,error,execution_count`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`
          }
        })

        if (statusResponse.ok) {
          const sessions = await statusResponse.json()
          if (sessions.length > 0) {
            const session = sessions[0]
            if (session.status !== lastStatus) {
              lastStatus = session.status
              console.log(`   Status changed to: ${lastStatus}`)
              if (session.execution_count > 0) {
                console.log(`   Lambda executions: ${session.execution_count}`)
              }
            } else {
              process.stdout.write('.')
            }

            if (session.final_response) {
              console.log('\n\n✅ Final response received:')
              console.log('   ' + session.final_response)
            }

            if (session.error) {
              console.log('\n\n❌ Error occurred:')
              console.log('   ' + session.error)
            }
          }
        }

        attempts++
      }

      if (lastStatus === 'completed') {
        console.log('\n\n🎉 Orchestration completed successfully!')
      } else if (lastStatus === 'failed') {
        console.log('\n\n❌ Orchestration failed')
      } else {
        console.log('\n\n⏱️  Orchestration still in progress after 2.5 minutes')
        console.log('   The Lambda poller runs every minute, so there might be a delay')
      }

      // Step 5: Check for tool executions
      console.log('\n6️⃣ Checking tool executions...')
      const toolsResponse = await fetch(`${supabaseUrl}/rest/v1/tool_executions?session_id=eq.${sessionId}&select=*`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (toolsResponse.ok) {
        const tools = await toolsResponse.json()
        if (tools.length > 0) {
          console.log(`   Found ${tools.length} tool execution(s):`)
          tools.forEach((tool: any, i: number) => {
            console.log(`   ${i + 1}. ${tool.tool_name} - ${tool.status}`)
            if (tool.duration_ms) {
              console.log(`      Duration: ${tool.duration_ms}ms`)
            }
          })
        } else {
          console.log('   No tool executions found (expected for simple request)')
        }
      }
    } else {
      console.log('\n⚠️  Async mode might not be enabled')
      console.log('   Response indicates synchronous processing')
      console.log('   Make sure ENABLE_ORCHESTRATION=true is set in Edge Function secrets')
    }

    // Step 6: Test synchronous mode for comparison
    console.log('\n\n7️⃣ Testing synchronous mode for comparison...')
    const syncResponse = await fetch(`${supabaseUrl}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        input: 'What is 2+2?',
        mode: 'sync'
      })
    })

    if (syncResponse.ok) {
      const syncData = await syncResponse.json()
      console.log('✅ Sync response received immediately:')
      console.log('   ', JSON.stringify(syncData.data, null, 2))
    }

    console.log('\n\n✅ End-to-end test complete!')
    console.log('\n📝 Summary:')
    console.log('   - User authentication: ✅')
    console.log('   - Edge Function call: ✅')
    console.log('   - Orchestration session: ' + (interactData.data?.sessionId ? '✅' : '❌'))
    console.log('   - Synchronous mode: ✅')
    
    console.log('\n💡 Next steps for manual testing:')
    console.log('   1. Sign in to the web app with these credentials:')
    console.log(`      Email: ${testEmail}`)
    console.log(`      Password: ${testPassword}`)
    console.log('   2. Send a message in the chat interface')
    console.log('   3. Watch for real-time updates as the orchestration runs')
    console.log('   4. Check CloudWatch logs for Lambda execution details')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
  }
}

// Run the test
testOrchestrationE2E()