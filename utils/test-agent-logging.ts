#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function testAgentLogging() {
  console.log('🔍 Testing agent event logging...\n')

  // Create a test orchestration session
  const sessionId = `test-${Date.now()}`
  
  try {
    // Test logging an agent_created event directly
    console.log('1. Testing agent_created event logging...')
    const { data: agentEvent, error: agentError } = await supabase.rpc('log_orchestration_event', {
      p_session_id: sessionId,
      p_event_type: 'agent_created',
      p_event_data: {
        agent_id: 'test-agent-1',
        name: 'Test Agent',
        specification: 'A test agent for debugging',
        persona_preview: 'Test persona...'
      }
    })
    
    if (agentError) {
      console.error('❌ Error logging agent_created:', agentError)
    } else {
      console.log('✅ agent_created event logged successfully')
    }

    // Test logging an agent_thought event
    console.log('\n2. Testing agent_thought event logging...')
    const { data: thoughtEvent, error: thoughtError } = await supabase.rpc('log_orchestration_event', {
      p_session_id: sessionId,
      p_event_type: 'agent_thought',
      p_event_data: {
        agent_id: 'test-agent-1',
        agent_name: 'Test Agent',
        thought: 'This is a test thought from the agent',
        is_key_decision: false,
        thought_type: 'general'
      }
    })
    
    if (thoughtError) {
      console.error('❌ Error logging agent_thought:', thoughtError)
    } else {
      console.log('✅ agent_thought event logged successfully')
    }

    // Test logging a discussion_turn event
    console.log('\n3. Testing discussion_turn event logging...')
    const { data: discussionEvent, error: discussionError } = await supabase.rpc('log_orchestration_event', {
      p_session_id: sessionId,
      p_event_type: 'discussion_turn',
      p_event_data: {
        agent_id: 'test-agent-1',
        agent_name: 'Test Agent',
        message: 'This is a test discussion message',
        round: 1,
        topic: 'Test Topic',
        style: 'collaborative'
      }
    })
    
    if (discussionError) {
      console.error('❌ Error logging discussion_turn:', discussionError)
    } else {
      console.log('✅ discussion_turn event logged successfully')
    }

    // Verify events were saved
    console.log('\n4. Verifying events were saved...')
    const { data: events, error: fetchError } = await supabase
      .from('orchestration_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('❌ Error fetching events:', fetchError)
    } else {
      console.log(`✅ Found ${events?.length || 0} events:`)
      events?.forEach(event => {
        console.log(`   - ${event.event_type}: ${JSON.stringify(event.event_data).substring(0, 100)}...`)
      })
    }

    // Check if the RPC function exists
    console.log('\n5. Checking RPC function definition...')
    const { data: functions, error: funcError } = await supabase.rpc('get_functions', {})
      .catch(() => ({ data: null, error: 'Function listing not available' }))
    
    if (funcError) {
      console.log('⚠️  Cannot list functions (this is normal)')
    } else if (functions) {
      const hasLogFunction = functions.some((f: any) => f.name === 'log_orchestration_event')
      console.log(hasLogFunction ? '✅ log_orchestration_event function exists' : '❌ log_orchestration_event function not found')
    }

    // Clean up test events
    console.log('\n6. Cleaning up test events...')
    const { error: deleteError } = await supabase
      .from('orchestration_events')
      .delete()
      .eq('session_id', sessionId)
    
    if (deleteError) {
      console.error('❌ Error cleaning up:', deleteError)
    } else {
      console.log('✅ Test events cleaned up')
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

testAgentLogging().catch(console.error)