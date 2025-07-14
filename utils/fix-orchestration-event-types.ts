#!/usr/bin/env tsx
/**
 * Fix orchestration event types by adding missing types
 */

import { createClient } from '@supabase/supabase-js'
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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixEventTypes() {
  console.log('🔧 Fixing orchestration event types...\n')

  try {
    // Drop the existing constraint
    console.log('1️⃣ Dropping existing constraint...')
    const { error: dropError } = await supabase.rpc('query_runner', {
      query: `ALTER TABLE orchestration_events DROP CONSTRAINT IF EXISTS orchestration_events_event_type_check;`
    })
    
    if (dropError) {
      console.error('❌ Error dropping constraint:', dropError)
      // Continue anyway, it might not exist
    } else {
      console.log('✅ Constraint dropped')
    }

    // Add the new constraint with all event types
    console.log('\n2️⃣ Adding new constraint with all event types...')
    const { error: addError } = await supabase.rpc('query_runner', {
      query: `
        ALTER TABLE orchestration_events 
        ADD CONSTRAINT orchestration_events_event_type_check 
        CHECK (event_type IN (
          'tool_call',
          'tool_result',
          'verification',
          'retry',
          'thinking',
          'status_update',
          'error',
          'context_compression',
          'agent_created',
          'agent_thought',
          'discussion_turn'
        ));
      `
    })
    
    if (addError) {
      console.error('❌ Error adding constraint:', addError)
      return
    }
    
    console.log('✅ New constraint added successfully')

    // Test the new event types
    console.log('\n3️⃣ Testing new event types...')
    
    // Get a test session
    const { data: session } = await supabase
      .from('orchestration_sessions')
      .select('id')
      .limit(1)
      .single()

    if (!session) {
      console.log('⚠️  No session found for testing')
      return
    }

    const newEventTypes = ['agent_created', 'agent_thought', 'discussion_turn']
    
    for (const eventType of newEventTypes) {
      const { data, error } = await supabase.rpc('log_orchestration_event', {
        p_session_id: session.id,
        p_event_type: eventType,
        p_event_data: {
          test: true,
          event_type: eventType,
          timestamp: new Date().toISOString()
        },
        p_metadata: { source: 'fix-script' }
      })

      if (error) {
        console.log(`  ❌ ${eventType}: ${error.message}`)
      } else {
        console.log(`  ✅ ${eventType}: Event ID ${data}`)
      }
    }

    console.log('\n✅ Event types fixed successfully!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the fix
fixEventTypes()