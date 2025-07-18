#!/usr/bin/env tsx
/**
 * Check orchestration logs for a specific session or thread
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

async function checkOrchestrationLogs(identifier?: string) {
  try {
    // Check if identifier is a session ID or thread ID
    let sessionId: string | undefined
    let threadId: string | undefined
    
    if (identifier) {
      // Check if it's a session ID (UUIDs)
      if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        sessionId = identifier
      } else {
        threadId = identifier
      }
    }
    
    // If session ID provided, use that directly
    if (sessionId) {
      await checkSessionLogs(sessionId)
      return
    }
    
    // Otherwise check by thread
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

async function checkSessionLogs(sessionId: string) {
  console.log('\n=== Checking Session Logs ===\n')
  console.log('Session ID:', sessionId)
  
  // Get session details
  const { data: session, error: sessionError } = await supabase
    .from('orchestration_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  
  if (sessionError || !session) {
    console.error('Session not found:', sessionError)
    return
  }
  
  console.log('Status:', session.status)
  console.log('Created:', new Date(session.created_at).toLocaleString())
  console.log('Thread ID:', session.tool_state?.thread_id || 'No thread associated')
  
  // Get all events for this session
  const { data: events, error: eventsError } = await supabase
    .from('orchestration_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  
  if (eventsError) {
    console.error('Error fetching events:', eventsError)
    return
  }
  
  console.log(`\nFound ${events?.length || 0} events\n`)
  
  // Group events by type
  const eventsByType = new Map<string, any[]>()
  events?.forEach(event => {
    if (!eventsByType.has(event.event_type)) {
      eventsByType.set(event.event_type, [])
    }
    eventsByType.get(event.event_type)!.push(event)
  })
  
  // Show summary
  console.log('Event Summary:')
  eventsByType.forEach((events, type) => {
    console.log(`  - ${type}: ${events.length} event(s)`)
  })
  console.log()
  
  // Detailed event analysis
  console.log('=== Detailed Event Analysis ===\n')
  
  // Check for agents
  const agentEvents = eventsByType.get('agent_created') || []
  const agentThoughts = eventsByType.get('agent_thought') || []
  const discussionTurns = eventsByType.get('discussion_turn') || []
  
  if (agentEvents.length > 0) {
    console.log(`Agents Created: ${agentEvents.length}`)
    agentEvents.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.event_data.name} - ${e.event_data.specification}`)
    })
    console.log()
  }
  
  if (agentThoughts.length > 0) {
    console.log(`Agent Thoughts: ${agentThoughts.length}`)
    const thoughtsByAgent = new Map<string, any[]>()
    agentThoughts.forEach(e => {
      const agentName = e.event_data.agent_name || 'Unknown'
      if (!thoughtsByAgent.has(agentName)) {
        thoughtsByAgent.set(agentName, [])
      }
      thoughtsByAgent.get(agentName)!.push(e)
    })
    
    thoughtsByAgent.forEach((thoughts, agent) => {
      console.log(`  ${agent}: ${thoughts.length} thoughts`)
    })
    console.log()
  }
  
  if (discussionTurns.length > 0) {
    console.log(`Discussion Turns: ${discussionTurns.length}`)
    // Group by discussion
    const discussions = new Map<string, any[]>()
    discussionTurns.forEach(e => {
      const key = `${e.event_data.topic} (${e.event_data.style})`
      if (!discussions.has(key)) {
        discussions.set(key, [])
      }
      discussions.get(key)!.push(e)
    })
    
    discussions.forEach((turns, discussion) => {
      console.log(`  ${discussion}: ${turns.length} exchanges`)
    })
    console.log()
  }
  
  // Check for issues
  console.log('=== Issue Detection ===\n')
  
  // Check for failed tools
  const toolResults = eventsByType.get('tool_result') || []
  const failedTools = toolResults.filter(e => !e.event_data.success)
  if (failedTools.length > 0) {
    console.log(`Failed Tools: ${failedTools.length}`)
    failedTools.forEach(e => {
      console.log(`  - ${e.event_data.tool}: ${e.event_data.error}`)
    })
    console.log()
  }
  
  // Check verification results
  const verifications = eventsByType.get('verification') || []
  if (verifications.length > 0) {
    console.log('Verification Results:')
    verifications.forEach(e => {
      console.log(`  - Goal Achieved: ${e.event_data.achieved}`)
      console.log(`    Confidence: ${e.event_data.confidence}`)
      if (e.event_data.issues?.length > 0) {
        console.log(`    Issues: ${e.event_data.issues.join(', ')}`)
      }
    })
    console.log()
  }
  
  // Show timeline of key events
  console.log('=== Event Timeline ===\n')
  const keyEvents = events?.filter(e => 
    ['status_update', 'tool_call', 'agent_created', 'discussion_turn', 'verification', 'error'].includes(e.event_type)
  ) || []
  
  keyEvents.forEach((event, idx) => {
    const time = new Date(event.created_at).toLocaleTimeString()
    let description = ''
    
    switch (event.event_type) {
      case 'status_update':
        description = `Status: ${event.event_data.from || '?'} → ${event.event_data.to || event.event_data.status}`
        break
      case 'tool_call':
        description = `Tool: ${event.event_data.tool}`
        break
      case 'agent_created':
        description = `Agent: ${event.event_data.name}`
        break
      case 'discussion_turn':
        description = `Discussion: ${event.event_data.agent_name} (Round ${event.event_data.round})`
        break
      case 'verification':
        description = `Verification: ${event.event_data.achieved ? 'Passed' : 'Failed'}`
        break
      case 'error':
        description = `Error: ${event.event_data.error}`
        break
    }
    
    console.log(`${time} - ${description}`)
  })
}

// Run with optional thread/session ID
const identifier = process.argv[2]
checkOrchestrationLogs(identifier).then(() => process.exit(0))