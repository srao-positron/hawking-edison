#!/usr/bin/env tsx
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function debugOrchestrationMetadata() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log('🔍 Debugging orchestration metadata issue...\n')
  
  // 1. Check chat_messages table for assistant messages with metadata
  console.log('1. Checking assistant messages with orchestration metadata:')
  const { data: messagesWithMetadata, error: msgError } = await supabase
    .from('chat_messages')
    .select('id, thread_id, role, metadata, created_at')
    .eq('role', 'assistant')
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (msgError) {
    console.error('Error fetching messages:', msgError)
    return
  }
  
  console.log(`Found ${messagesWithMetadata?.length || 0} assistant messages with metadata:`)
  messagesWithMetadata?.forEach(msg => {
    console.log(`  - Message ${msg.id} in thread ${msg.thread_id}`)
    console.log(`    Metadata:`, JSON.stringify(msg.metadata, null, 2))
  })
  
  // 2. Test the Edge Function directly
  if (messagesWithMetadata && messagesWithMetadata.length > 0) {
    const testThreadId = messagesWithMetadata[0].thread_id
    console.log(`\n2. Testing Edge Function with thread: ${testThreadId}`)
    
    // Simulate Edge Function query
    const { data: threadMessages, error: threadError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', testThreadId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true })
    
    if (threadError) {
      console.error('Error fetching thread messages:', threadError)
      return
    }
    
    console.log(`Found ${threadMessages?.length || 0} messages in thread`)
    const assistantMessages = threadMessages?.filter(m => m.role === 'assistant') || []
    console.log(`Assistant messages: ${assistantMessages.length}`)
    
    assistantMessages.forEach(msg => {
      console.log(`  - Message ${msg.id}:`)
      console.log(`    Has metadata: ${!!msg.metadata}`)
      console.log(`    Orchestration ID: ${msg.metadata?.orchestration_session_id || 'MISSING'}`)
    })
  }
  
  // 3. Check a specific orchestration session
  console.log('\n3. Checking recent orchestration sessions:')
  const { data: sessions, error: sessionError } = await supabase
    .from('orchestration_sessions')
    .select('id, status, tool_state, created_at')
    .order('created_at', { ascending: false })
    .limit(3)
  
  if (sessionError) {
    console.error('Error fetching sessions:', sessionError)
    return
  }
  
  console.log(`Found ${sessions?.length || 0} recent sessions:`)
  sessions?.forEach(session => {
    console.log(`  - Session ${session.id}: ${session.status}`)
    console.log(`    Thread ID: ${session.tool_state?.thread_id || 'Not set'}`)
  })
  
  // 4. Test actual API call
  console.log('\n4. Testing API call (requires auth token):')
  console.log('To test the actual API, run:')
  console.log('  1. Sign in to the app')
  console.log('  2. Open developer console')
  console.log('  3. Run: await api.threads.get("<thread-id>")')
  console.log('  4. Check if messages have metadata field')
}

debugOrchestrationMetadata().catch(console.error)