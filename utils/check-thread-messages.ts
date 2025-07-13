#!/usr/bin/env tsx
/**
 * Check thread messages in the database
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

async function checkThreadMessages(threadId?: string) {
  try {
    // If no threadId provided, get the most recent thread
    if (!threadId) {
      const { data: threads, error: threadsError } = await supabase
        .from('chat_threads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (threadsError) throw threadsError
      
      console.log('\n=== Recent Threads ===')
      threads?.forEach(thread => {
        console.log(`Thread: ${thread.id}`)
        console.log(`Title: ${thread.title}`)
        console.log(`Created: ${thread.created_at}`)
        console.log('---')
      })
      
      threadId = threads?.[0]?.id
      if (!threadId) {
        console.log('No threads found')
        return
      }
      
      console.log(`\nChecking messages for thread: ${threadId}`)
    }
    
    // Get all messages for the thread
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
    
    if (messagesError) throw messagesError
    
    console.log(`\n=== Messages in Thread ${threadId} ===`)
    console.log(`Total messages: ${messages?.length || 0}`)
    console.log('')
    
    messages?.forEach((msg, index) => {
      console.log(`Message ${index + 1}:`)
      console.log(`  ID: ${msg.id}`)
      console.log(`  Role: ${msg.role}`)
      console.log(`  Created: ${msg.created_at}`)
      console.log(`  Content length: ${msg.content?.length || 0} chars`)
      console.log(`  Content preview: ${msg.content?.substring(0, 200)}${msg.content?.length > 200 ? '...' : ''}`)
      console.log('')
    })
    
    // Check for any orchestration sessions related to this thread
    const { data: sessions, error: sessionsError } = await supabase
      .from('orchestration_sessions')
      .select('id, status, created_at, tool_state, messages')
      .or(`tool_state->thread_id.eq.${threadId},tool_state->thread_id.eq."${threadId}"`)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (!sessionsError && sessions?.length > 0) {
      console.log(`\n=== Related Orchestration Sessions ===`)
      sessions.forEach(session => {
        console.log(`Session: ${session.id}`)
        console.log(`Status: ${session.status}`)
        console.log(`Created: ${session.created_at}`)
        console.log(`Thread ID in tool_state: ${session.tool_state?.thread_id}`)
        console.log(`Messages in session: ${session.messages?.length || 0}`)
        console.log('---')
      })
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

// Run the check
const threadId = process.argv[2]
checkThreadMessages(threadId).then(() => process.exit(0))