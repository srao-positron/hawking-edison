#!/usr/bin/env tsx
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkThreadState(threadId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log(`\n🔍 Checking state of thread: ${threadId}\n`)
  
  // 1. Check messages
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    
  console.log(`Messages in thread: ${messages?.length || 0}`)
  messages?.forEach((m, i) => {
    console.log(`\n${i + 1}. ${m.role.toUpperCase()} message:`)
    console.log(`   ID: ${m.id}`)
    console.log(`   Content: ${m.content?.substring(0, 80)}...`)
    console.log(`   Metadata: ${JSON.stringify(m.metadata)}`)
    console.log(`   Created: ${m.created_at}`)
  })
  
  // 2. Check orchestration sessions
  console.log('\n🤖 Checking orchestration sessions:')
  const { data: sessions } = await supabase
    .from('orchestration_sessions')
    .select('*')
    .contains('tool_state', { thread_id: threadId })
    
  console.log(`Found ${sessions?.length || 0} orchestration sessions`)
  sessions?.forEach((s, i) => {
    console.log(`\n${i + 1}. Session ${s.id}:`)
    console.log(`   Status: ${s.status}`)
    console.log(`   Created: ${s.created_at}`)
    console.log(`   Has final response: ${!!s.final_response}`)
    console.log(`   Thread ID in state: ${s.tool_state?.thread_id}`)
  })
  
  // 3. Check if messages have correct orchestration IDs
  console.log('\n✅ Verification:')
  const assistantMessages = messages?.filter(m => m.role === 'assistant') || []
  const messagesWithOrchestration = assistantMessages.filter(m => m.metadata?.orchestration_session_id)
  
  console.log(`- Assistant messages: ${assistantMessages.length}`)
  console.log(`- With orchestration ID: ${messagesWithOrchestration.length}`)
  
  if (assistantMessages.length > messagesWithOrchestration.length) {
    console.log('\n⚠️  WARNING: Some assistant messages are missing orchestration_session_id!')
    assistantMessages.forEach(m => {
      if (!m.metadata?.orchestration_session_id) {
        console.log(`   - Message ${m.id} has no orchestration ID`)
      }
    })
  }
}

const threadId = process.argv[2] || 'ready-rain-339'
checkThreadState(threadId).catch(console.error)