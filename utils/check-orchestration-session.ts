#!/usr/bin/env tsx
/**
 * Check orchestration session status
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

async function checkOrchestrationSession(sessionId?: string) {
  try {
    // Get the most recent session or specific session
    let query = supabase
      .from('orchestration_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (sessionId) {
      query = supabase
        .from('orchestration_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
    }
    
    const { data: sessions, error } = await query
    
    if (error) {
      console.error('Error fetching session:', error)
      return
    }
    
    const sessionData = Array.isArray(sessions) ? sessions[0] : sessions
    
    if (!sessionData) {
      console.log('No session found')
      return
    }
    
    console.log('\n=== Orchestration Session ===')
    console.log('ID:', sessionData.id)
    console.log('Status:', sessionData.status)
    console.log('Created:', sessionData.created_at)
    console.log('Updated:', sessionData.updated_at)
    console.log('Execution Count:', sessionData.execution_count)
    console.log('Has Final Response:', !!sessionData.final_response)
    console.log('Thread ID:', sessionData.tool_state?.thread_id)
    
    if (sessionData.final_response) {
      console.log('\nFinal Response:')
      try {
        const parsed = JSON.parse(sessionData.final_response)
        console.log(JSON.stringify(parsed, null, 2))
      } catch (e) {
        console.log(sessionData.final_response)
      }
    }
    
    if (sessionData.error) {
      console.log('\nError:', sessionData.error)
    }
    
    // Check events
    const { data: events, error: eventsError } = await supabase
      .from('orchestration_events')
      .select('event_type, created_at')
      .eq('session_id', sessionData.id)
      .order('created_at', { ascending: true })
    
    if (!eventsError && events) {
      console.log(`\nEvents (${events.length} total):`)
      events.forEach(event => {
        console.log(`- ${event.event_type} at ${new Date(event.created_at).toLocaleTimeString()}`)
      })
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

// Run with optional session ID
const sessionId = process.argv[2]
checkOrchestrationSession(sessionId).then(() => process.exit(0))