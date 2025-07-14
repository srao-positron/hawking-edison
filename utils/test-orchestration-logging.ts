#!/usr/bin/env tsx
/**
 * Test orchestration event logging RPC function
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '../src/types/database.types'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bknpldydmkzupsfagnva.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

async function testOrchestrationLogging() {
  console.log('🔍 Testing orchestration event logging...\n')

  try {
    // First, let's check if the function exists
    const { data: functions, error: funcError } = await supabase.rpc('pg_proc', {})
    if (funcError) {
      console.log('❌ Error checking functions:', funcError)
    }

    // Get a test session ID (we'll need to create one or use existing)
    const { data: sessions, error: sessionError } = await supabase
      .from('orchestration_sessions')
      .select('id, user_id, tool_state')
      .limit(1)
      .single()

    if (sessionError || !sessions) {
      console.error('❌ No orchestration sessions found. Please create one first.')
      console.error('Error:', sessionError)
      return
    }

    console.log('📋 Using session:', sessions.id)
    console.log('👤 User ID:', sessions.user_id)
    console.log('🧵 Thread ID:', sessions.tool_state?.thread_id || 'No thread ID')

    // Test valid event types
    const validEventTypes = [
      'tool_call',
      'tool_result',
      'verification',
      'retry',
      'thinking',
      'status_update',
      'error',
      'context_compression'
    ]

    console.log('\n✅ Testing VALID event types:')
    for (const eventType of validEventTypes) {
      const { data, error } = await supabase.rpc('log_orchestration_event', {
        p_session_id: sessions.id,
        p_event_type: eventType,
        p_event_data: {
          test: true,
          event_type: eventType,
          timestamp: new Date().toISOString()
        },
        p_metadata: { source: 'test-script' }
      })

      if (error) {
        console.log(`  ❌ ${eventType}: ${error.message}`)
      } else {
        console.log(`  ✅ ${eventType}: Event ID ${data}`)
      }
    }

    // Test invalid event types that are being used in the code
    const invalidEventTypes = ['agent_created', 'agent_thought', 'discussion_turn']
    
    console.log('\n❌ Testing INVALID event types (should fail):')
    for (const eventType of invalidEventTypes) {
      const { data, error } = await supabase.rpc('log_orchestration_event', {
        p_session_id: sessions.id,
        p_event_type: eventType,
        p_event_data: {
          test: true,
          event_type: eventType,
          timestamp: new Date().toISOString()
        },
        p_metadata: { source: 'test-script' }
      })

      if (error) {
        console.log(`  ❌ ${eventType}: ${error.message} (Expected failure)`)
      } else {
        console.log(`  ⚠️  ${eventType}: Unexpectedly succeeded with ID ${data}`)
      }
    }

    // Check if events were actually logged
    console.log('\n📊 Checking logged events:')
    const { data: events, error: eventsError } = await supabase
      .from('orchestration_events')
      .select('*')
      .eq('session_id', sessions.id)
      .eq('metadata->source', 'test-script')
      .order('created_at', { ascending: false })

    if (eventsError) {
      console.error('❌ Error fetching events:', eventsError)
    } else {
      console.log(`Found ${events.length} test events`)
      events.forEach(event => {
        console.log(`  - ${event.event_type}: ${event.id} (${new Date(event.created_at).toISOString()})`)
      })
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the test
testOrchestrationLogging()