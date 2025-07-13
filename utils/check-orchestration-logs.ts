#!/usr/bin/env tsx
/**
 * Check orchestration logs for a specific thread
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

async function checkOrchestrationLogs(threadId?: string) {
  try {
    // Get thread
    let thread
    if (threadId) {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', threadId)
        .single()
      
      if (error) throw error
      thread = data
    } else {
      // Get most recent thread
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (error) throw error
      thread = data?.[0]
    }
    
    if (!thread) {
      console.log('No thread found')
      return
    }
    
    console.log('\n=== Thread ===')
    console.log('ID:', thread.id)
    console.log('Title:', thread.title)
    console.log('Created:', thread.created_at)
    console.log('Message Count:', thread.message_count)
    
    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true })
    
    if (!messagesError && messages) {
      console.log('\n=== Messages ===')
      messages.forEach((msg, index) => {
        console.log(`\n${index + 1}. ${msg.role.toUpperCase()} (${new Date(msg.created_at).toLocaleTimeString()})`)
        console.log('   Content:', msg.content?.substring(0, 100) + (msg.content?.length > 100 ? '...' : ''))
        if (msg.metadata?.orchestration_session_id) {
          console.log('   Orchestration Session:', msg.metadata.orchestration_session_id)
        }
      })
    }
    
    // Get orchestration sessions for this thread
    const { data: sessions, error: sessionsError } = await supabase
      .from('orchestration_sessions')
      .select('*')
      .or(`tool_state->thread_id.eq.${thread.id},tool_state->thread_id.eq."${thread.id}"`)
      .order('created_at', { ascending: true })
    
    if (!sessionsError && sessions) {
      console.log('\n=== Orchestration Sessions ===')
      for (const session of sessions) {
        console.log(`\nSession: ${session.id}`)
        console.log('Status:', session.status)
        console.log('Created:', new Date(session.created_at).toLocaleTimeString())
        console.log('Messages in session:', session.messages?.length)
        
        // Show the user message that triggered this session
        const userMessages = session.messages?.filter((m: any) => m.role === 'user' && !m.content?.startsWith('Verification failed'))
        if (userMessages?.length > 0) {
          console.log('User input:', userMessages[userMessages.length - 1].content?.substring(0, 100) + '...')
        }
        
        // Get events for this session
        const { data: events, error: eventsError } = await supabase
          .from('orchestration_events')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true })
        
        if (!eventsError && events) {
          console.log(`Events (${events.length}):`)
          events.forEach(event => {
            console.log(`  - ${event.event_type} at ${new Date(event.created_at).toLocaleTimeString()}`)
            if (event.event_type === 'verification' && event.event_data) {
              console.log(`    Goal: ${event.event_data.goal?.substring(0, 100)}...`)
              console.log(`    Achieved: ${event.event_data.achieved}`)
              if (event.event_data.issues?.length > 0) {
                console.log(`    Issues:`, event.event_data.issues)
              }
            }
          })
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

// Run with optional thread ID
const threadId = process.argv[2]
checkOrchestrationLogs(threadId).then(() => process.exit(0))