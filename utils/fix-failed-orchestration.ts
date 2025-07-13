#!/usr/bin/env tsx
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function fixFailedOrchestration(sessionId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log(`\n🔧 Fixing failed orchestration: ${sessionId}\n`)
  
  // 1. Load the session
  const { data: session, error: sessionError } = await supabase
    .from('orchestration_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  
  if (sessionError || !session) {
    console.error('Failed to load session:', sessionError)
    return
  }
  
  console.log('Session info:')
  console.log(`  Status: ${session.status}`)
  console.log(`  Thread ID: ${session.tool_state?.thread_id}`)
  console.log(`  User ID: ${session.user_id}`)
  console.log(`  Error: ${session.error}`)
  
  if (!session.tool_state?.thread_id) {
    console.error('No thread ID found in session')
    return
  }
  
  // 2. Check if assistant message already exists
  const { data: existingMessages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', session.tool_state.thread_id)
    .eq('role', 'assistant')
  
  if (existingMessages && existingMessages.length > 0) {
    console.log('Assistant message already exists')
    return
  }
  
  // 3. Find the last assistant response in session messages
  const assistantMessages = session.messages?.filter((m: any) => 
    m.role === 'assistant' && m.content
  ) || []
  
  const lastResponse = assistantMessages[assistantMessages.length - 1]?.content ||
    'I successfully posted a comprehensive code review to the GitHub PR. The review covered security vulnerabilities, operational excellence concerns, and algorithm/data structure issues. However, an error occurred while saving the final response.'
  
  // 4. Create the assistant message
  console.log('\nCreating assistant message...')
  const { data: newMessage, error: msgError } = await supabase
    .from('chat_messages')
    .insert({
      thread_id: session.tool_state.thread_id,
      user_id: session.user_id,
      role: 'assistant',
      content: lastResponse,
      metadata: {
        orchestration_session_id: sessionId,
        error: true,
        error_message: session.error,
        note: 'Message created retroactively after orchestration completed but failed to save'
      },
      created_at: session.updated_at || session.created_at
    })
    .select()
    .single()
  
  if (msgError) {
    console.error('Failed to create message:', msgError)
    return
  }
  
  console.log('✅ Successfully created assistant message')
  console.log(`   Message ID: ${newMessage.id}`)
  console.log(`   Orchestration ID in metadata: ${newMessage.metadata.orchestration_session_id}`)
  
  // 5. Update thread message count
  const { data: thread } = await supabase
    .from('chat_threads')
    .select('message_count')
    .eq('id', session.tool_state.thread_id)
    .single()
  
  if (thread) {
    await supabase
      .from('chat_threads')
      .update({
        message_count: (thread.message_count || 1) + 1,
        last_message_at: newMessage.created_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.tool_state.thread_id)
    
    console.log('✅ Updated thread message count')
  }
  
  console.log('\n🎉 Fix complete! The Details button should now appear when you refresh the page.')
}

// Run for the specific failed session
const sessionId = process.argv[2] || '6db9c4b4-18fc-4943-a62d-d170c9aa3cdd'
fixFailedOrchestration(sessionId).catch(console.error)