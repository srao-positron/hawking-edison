#!/usr/bin/env npx tsx
// Test the complete orchestration flow

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bknpldydmkzupsfagnva.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testOrchestrationFlow() {
  console.log('🧪 Testing orchestration flow...\n')
  
  try {
    // 1. Create a test request that should trigger orchestration
    const testInput = 'Run a panel discussion with 3 experts about the future of AI'
    console.log(`1️⃣ Sending test request: "${testInput}"`)
    
    const response = await fetch(`${supabaseUrl}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        input: testInput,
        mode: 'async' // Force async mode
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Edge Function error: ${error}`)
    }
    
    const result = await response.json()
    console.log('✅ Response:', result)
    
    if (!result.data?.sessionId) {
      console.log('⚠️ No orchestration session created - SNS might not be configured')
      return
    }
    
    const sessionId = result.data.sessionId
    console.log(`\n2️⃣ Orchestration session created: ${sessionId}`)
    
    // 2. Check session status
    console.log('\n3️⃣ Checking session status...')
    const { data: session, error } = await supabase
      .from('orchestration_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    
    if (error) {
      throw new Error(`Failed to get session: ${error.message}`)
    }
    
    console.log('Session status:', session.status)
    console.log('Messages:', session.messages?.length || 0)
    
    // 3. Subscribe to realtime updates
    console.log('\n4️⃣ Subscribing to realtime updates...')
    const channel = supabase
      .channel(`orchestration:${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orchestration_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload) => {
        console.log('📡 Session update:', {
          status: payload.new.status,
          executionCount: payload.new.execution_count,
          hasResponse: !!payload.new.final_response
        })
        
        if (payload.new.status === 'completed') {
          console.log('\n✅ Orchestration completed!')
          console.log('Final response:', payload.new.final_response)
          process.exit(0)
        } else if (payload.new.status === 'failed') {
          console.error('\n❌ Orchestration failed:', payload.new.error)
          process.exit(1)
        }
      })
      .subscribe()
    
    console.log('Waiting for orchestration to complete...')
    console.log('(This may take a while if AWS Lambda is processing)')
    
    // Keep process alive
    setTimeout(() => {
      console.log('\n⏱️ Timeout - orchestration taking too long')
      console.log('Check AWS CloudWatch logs for Lambda execution details')
      process.exit(1)
    }, 300000) // 5 minute timeout
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testOrchestrationFlow()