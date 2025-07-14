#!/usr/bin/env tsx
/**
 * Verify orchestration event logging fixes
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

async function verifyFixes() {
  console.log('🔍 Verifying orchestration event logging fixes...\n')

  try {
    // Get a test session
    const { data: session, error: sessionError } = await supabase
      .from('orchestration_sessions')
      .select('id, user_id, tool_state')
      .limit(1)
      .single()

    if (sessionError || !session) {
      console.error('❌ No orchestration sessions found')
      return
    }

    console.log('📋 Using session:', session.id)

    // Test the event types that were causing issues
    const eventMappings = [
      { 
        old: 'agent_created', 
        new: 'tool_result',
        data: {
          tool: 'createAgent',
          success: true,
          result: {
            agent_id: 'test-agent-1',
            name: 'Test Agent',
            specification: 'A test agent'
          }
        }
      },
      { 
        old: 'agent_thought', 
        new: 'thinking',
        data: {
          content: 'Test agent thought process',
          step: 'agent_discussion',
          agent_context: {
            agent_id: 'test-agent-1',
            agent_name: 'Test Agent'
          }
        }
      },
      { 
        old: 'discussion_turn', 
        new: 'tool_result',
        data: {
          tool: 'runDiscussion',
          success: true,
          result: {
            agent_id: 'test-agent-1',
            agent_name: 'Test Agent',
            message: 'Test discussion message',
            round: 1
          }
        }
      }
    ]

    console.log('✅ Testing fixed event types:\n')
    
    for (const mapping of eventMappings) {
      console.log(`📝 ${mapping.old} → ${mapping.new}`)
      
      const { data, error } = await supabase.rpc('log_orchestration_event', {
        p_session_id: session.id,
        p_event_type: mapping.new,
        p_event_data: mapping.data,
        p_metadata: { source: 'verify-script', original_type: mapping.old }
      })

      if (error) {
        console.log(`  ❌ Failed: ${error.message}`)
      } else {
        console.log(`  ✅ Success: Event ID ${data}`)
      }
    }

    // Check recent events
    console.log('\n📊 Recent orchestration events:')
    const { data: events, error: eventsError } = await supabase
      .from('orchestration_events')
      .select('event_type, created_at, event_data')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!eventsError && events) {
      events.forEach(event => {
        const time = new Date(event.created_at).toLocaleTimeString()
        const tool = event.event_data?.tool || ''
        console.log(`  - ${event.event_type}${tool ? ` (${tool})` : ''} at ${time}`)
      })
    }

    console.log('\n✅ Verification complete!')
    console.log('\n📋 Summary:')
    console.log('- agent_created → tool_result (with tool: createAgent)')
    console.log('- agent_thought → thinking (with step: agent_discussion)')
    console.log('- discussion_turn → tool_result (with tool: runDiscussion)')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run verification
verifyFixes()