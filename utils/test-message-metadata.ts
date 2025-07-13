#!/usr/bin/env tsx
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testMessageMetadata() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // Test thread ID - use one from the debug output
  const testThreadId = process.argv[2] || 'ready-rain-339'
  
  console.log(`\n🔍 Testing message metadata for thread: ${testThreadId}\n`)
  
  // 1. Direct database query (what the Edge Function does)
  console.log('1. Direct database query:')
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', testThreadId)
    .in('role', ['user', 'assistant'])
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log(`Found ${messages?.length || 0} messages`)
  messages?.forEach(msg => {
    if (msg.role === 'assistant') {
      console.log(`\nAssistant message ${msg.id}:`)
      console.log(`  Content: ${msg.content.substring(0, 50)}...`)
      console.log(`  Has metadata: ${!!msg.metadata}`)
      console.log(`  Metadata:`, msg.metadata)
      console.log(`  Orchestration ID: ${msg.metadata?.orchestration_session_id || 'NONE'}`)
    }
  })
  
  // 2. Test the exact query pattern
  console.log('\n2. Testing exact Edge Function pattern:')
  const { data: thread } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('id', testThreadId)
    .single()
  
  console.log(`Thread found: ${!!thread}`)
  console.log(`Thread title: ${thread?.title}`)
  
  // 3. Test what the frontend would receive
  console.log('\n3. Simulating frontend data mapping:')
  const mappedMessages = messages?.map((msg: any) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: new Date(msg.created_at),
    orchestrationSessionId: msg.metadata?.orchestration_session_id
  }))
  
  const assistantWithOrchestration = mappedMessages?.filter(
    m => m.role === 'assistant' && m.orchestrationSessionId
  )
  
  console.log(`\nMapped messages with orchestration: ${assistantWithOrchestration?.length || 0}`)
  assistantWithOrchestration?.forEach(msg => {
    console.log(`  - ${msg.id}: orchestrationId = ${msg.orchestrationSessionId}`)
  })
  
  // 4. Verify the orchestration session exists
  if (assistantWithOrchestration && assistantWithOrchestration.length > 0) {
    const orchId = assistantWithOrchestration[0].orchestrationSessionId
    console.log(`\n4. Checking orchestration session: ${orchId}`)
    
    const { data: session } = await supabase
      .from('orchestration_sessions')
      .select('id, status, created_at, completed_at')
      .eq('id', orchId)
      .single()
    
    console.log(`Session found: ${!!session}`)
    console.log(`Status: ${session?.status}`)
    console.log(`Completed: ${!!session?.completed_at}`)
  }
}

testMessageMetadata().catch(console.error)