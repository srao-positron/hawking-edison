#!/usr/bin/env tsx
/**
 * Test orchestration events are being logged properly
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testOrchestrationEvents() {
  try {
    // Get the most recent orchestration session
    const { data: sessions, error: sessionsError } = await supabase
      .from('orchestration_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (sessionsError || !sessions || sessions.length === 0) {
      console.error('No orchestration sessions found')
      return
    }
    
    const session = sessions[0]
    console.log(`\n=== Orchestration Session: ${session.id} ===`)
    console.log(`Status: ${session.status}`)
    console.log(`Created: ${session.created_at}`)
    console.log(`Thread ID: ${session.tool_state?.thread_id || 'N/A'}`)
    
    // Get events for this session
    const { data: events, error: eventsError } = await supabase
      .from('orchestration_events')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
    
    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return
    }
    
    console.log(`\n=== Orchestration Events (${events?.length || 0} total) ===\n`)
    
    events?.forEach((event, index) => {
      console.log(`Event ${index + 1}: ${event.event_type}`)
      console.log(`Time: ${new Date(event.created_at).toLocaleTimeString()}`)
      console.log(`Data:`, JSON.stringify(event.event_data, null, 2))
      console.log('---')
    })
    
    // Subscribe to real-time events
    console.log('\n=== Subscribing to real-time events ===')
    console.log('Create a new chat to see events in real-time...\n')
    
    const channel = supabase
      .channel('test-orchestration-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orchestration_events'
        },
        (payload) => {
          const event = payload.new as any
          console.log(`\n🔴 LIVE EVENT: ${event.event_type}`)
          console.log(`Session: ${event.session_id}`)
          console.log(`Data:`, JSON.stringify(event.event_data, null, 2))
        }
      )
      .subscribe()
    
    // Keep the script running to watch events
    setTimeout(() => {
      console.log('\nUnsubscribing...')
      supabase.removeChannel(channel)
      process.exit(0)
    }, 60000) // 1 minute
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testOrchestrationEvents()