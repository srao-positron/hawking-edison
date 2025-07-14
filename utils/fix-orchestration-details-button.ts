#!/usr/bin/env tsx
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function fixOrchestrationDetailsButton() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log('🔧 Analyzing orchestration Details button visibility issue...\n')
  
  // 1. Check the specific thread with active orchestration
  const threadId = process.argv[2]
  if (!threadId) {
    console.log('Usage: npx tsx utils/fix-orchestration-details-button.ts <thread-id>')
    return
  }
  
  console.log(`Checking thread: ${threadId}\n`)
  
  // 2. Get all orchestration sessions for this thread
  const { data: sessions } = await supabase
    .from('orchestration_sessions')
    .select('*')
    .contains('tool_state', { thread_id: threadId })
    .order('created_at', { ascending: false })
  
  console.log(`Found ${sessions?.length || 0} orchestration sessions:`)
  sessions?.forEach(s => {
    console.log(`  - ${s.id}: ${s.status} (created: ${s.created_at})`)
  })
  
  // Find active sessions
  const activeSessions = sessions?.filter(s => 
    ['pending', 'running', 'resuming'].includes(s.status)
  ) || []
  
  console.log(`\nActive sessions: ${activeSessions.length}`)
  
  // 3. Get all messages in the thread
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
  
  console.log(`\nMessages in thread: ${messages?.length || 0}`)
  messages?.forEach(m => {
    console.log(`  - ${m.role}: ${m.content?.substring(0, 50)}...`)
    console.log(`    Has orchestration ID: ${!!m.metadata?.orchestration_session_id}`)
    if (m.metadata?.orchestration_session_id) {
      console.log(`    Orchestration ID: ${m.metadata.orchestration_session_id}`)
    }
  })
  
  // 4. Diagnosis
  console.log('\n📊 DIAGNOSIS:')
  
  const assistantMessages = messages?.filter(m => m.role === 'assistant') || []
  const messagesWithOrchestrationId = assistantMessages.filter(m => 
    m.metadata?.orchestration_session_id
  )
  
  console.log(`- Assistant messages: ${assistantMessages.length}`)
  console.log(`- With orchestration ID: ${messagesWithOrchestrationId.length}`)
  console.log(`- Active orchestrations: ${activeSessions.length}`)
  
  if (activeSessions.length > 0 && messagesWithOrchestrationId.length === 0) {
    console.log('\n⚠️  ISSUE FOUND: Active orchestration but no messages have orchestrationSessionId')
    console.log('This happens when:')
    console.log('1. The orchestration is still running (no assistant message yet)')
    console.log('2. The page was refreshed before the thinking message was added')
    console.log('\nThe UI should show a thinking message with Details button for active orchestrations.')
  }
  
  if (assistantMessages.length > messagesWithOrchestrationId.length) {
    console.log('\n⚠️  ISSUE FOUND: Some assistant messages missing orchestrationSessionId')
    console.log('This prevents the Details button from showing on those messages.')
  }
  
  // 5. Check the UI logic
  console.log('\n🔍 UI LOGIC CHECK:')
  console.log('Details button shows when:')
  console.log('1. message.orchestrationSessionId is set')
  console.log('2. message.role === "assistant"')
  console.log('\nFor active orchestrations, checkActiveOrchestrations() should:')
  console.log('1. Find active sessions for the thread')
  console.log('2. Add a thinking message with orchestrationSessionId')
  console.log('3. Set up realtime subscription')
}

fixOrchestrationDetailsButton().catch(console.error)