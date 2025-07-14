#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function diagnoseOrchestrationPanel() {
  console.log('🔍 Diagnosing Orchestration Panel Issues\n')

  // 1. Find a recent session with the specific thread
  const threadId = 'lively-forest-52'
  console.log(`1. Finding orchestration session for thread: ${threadId}`)
  
  const { data: sessions, error: sessionsError } = await supabase
    .from('orchestration_sessions')
    .select('*')
    .contains('tool_state', { thread_id: threadId })
    .order('created_at', { ascending: false })
    .limit(1)

  if (sessionsError || !sessions?.length) {
    console.error('❌ No sessions found for thread')
    return
  }

  const session = sessions[0]
  console.log(`✅ Found session: ${session.id}`)
  console.log(`   Status: ${session.status}`)
  console.log(`   Created: ${new Date(session.created_at).toLocaleString()}`)

  // 2. Get all events for this session
  console.log(`\n2. Fetching events for session...`)
  const { data: events, error: eventsError } = await supabase
    .from('orchestration_events')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })

  if (eventsError) {
    console.error('❌ Error fetching events:', eventsError)
    return
  }

  console.log(`✅ Found ${events?.length || 0} events`)

  // 3. Analyze event types
  console.log('\n3. Event Type Analysis:')
  const eventCounts = new Map<string, number>()
  events?.forEach(event => {
    eventCounts.set(event.event_type, (eventCounts.get(event.event_type) || 0) + 1)
  })

  eventCounts.forEach((count, type) => {
    console.log(`   ${type}: ${count}`)
  })

  // 4. Look for agent-related tool calls
  console.log('\n4. Agent-Related Tool Calls:')
  const agentToolCalls = events?.filter(e => 
    e.event_type === 'tool_call' && 
    ['createAgent', 'createMultipleAgents', 'runDiscussion', 'gatherIndependentResponses'].includes(e.event_data.tool)
  )

  agentToolCalls?.forEach(toolCall => {
    console.log(`\n   Tool: ${toolCall.event_data.tool}`)
    console.log(`   Time: ${new Date(toolCall.created_at).toLocaleTimeString()}`)
    console.log(`   Arguments:`, JSON.stringify(toolCall.event_data.arguments, null, 2).substring(0, 200) + '...')
    
    // Find corresponding result
    const result = events?.find(e => 
      e.event_type === 'tool_result' && 
      e.event_data.tool_call_id === toolCall.event_data.tool_call_id
    )
    
    if (result) {
      console.log(`   Result: ${result.event_data.success ? '✅ Success' : '❌ Failed'}`)
      if (!result.event_data.success) {
        console.log(`   Error: ${result.event_data.error}`)
      }
    } else {
      console.log(`   Result: ⏳ No result found`)
    }
  })

  // 5. Check for missing event types
  console.log('\n5. Missing Event Types:')
  const expectedEventTypes = ['agent_created', 'agent_thought', 'discussion_turn']
  const missingTypes = expectedEventTypes.filter(type => !eventCounts.has(type))
  
  if (missingTypes.length > 0) {
    console.log('❌ Missing event types:', missingTypes.join(', '))
    console.log('\nThis explains why the UI shows:')
    if (missingTypes.includes('agent_created')) {
      console.log('   - No agents in the Agents section')
    }
    if (missingTypes.includes('agent_thought')) {
      console.log('   - No agent thoughts/responses')
    }
    if (missingTypes.includes('discussion_turn')) {
      console.log('   - "0 exchanges" in discussions')
    }
  } else {
    console.log('✅ All expected event types are present')
  }

  // 6. Check session messages for agent responses
  console.log('\n6. Checking Session Messages:')
  const messages = session.messages || []
  console.log(`   Total messages: ${messages.length}`)
  
  const toolMessages = messages.filter((m: any) => m.role === 'tool')
  console.log(`   Tool response messages: ${toolMessages.length}`)

  // Look for agent creation results
  const agentCreationResults = toolMessages.filter((m: any) => {
    try {
      const content = JSON.parse(m.content)
      return content.result && (content.result.id?.includes('agent_') || content.result.agents)
    } catch {
      return false
    }
  })

  console.log(`   Agent creation results: ${agentCreationResults.length}`)
  
  if (agentCreationResults.length > 0) {
    console.log('\n   Sample agent creation result:')
    try {
      const result = JSON.parse(agentCreationResults[0].content).result
      console.log(`   ${JSON.stringify(result, null, 2).substring(0, 300)}...`)
    } catch (e) {
      console.log('   Could not parse result')
    }
  }

  // 7. Recommendations
  console.log('\n7. Recommendations:')
  console.log('   The Lambda functions are creating agents but NOT logging the events.')
  console.log('   This needs to be fixed in the Lambda code by ensuring:')
  console.log('   - createAgent tool calls log_orchestration_event with agent_created')
  console.log('   - runDiscussion tool logs discussion_turn events for each exchange')
  console.log('   - Agent responses log agent_thought events')
  console.log('\n   The issue is in the Lambda implementation, not the UI.')
}

diagnoseOrchestrationPanel().catch(console.error)