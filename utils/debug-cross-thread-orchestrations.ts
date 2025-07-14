#!/usr/bin/env tsx
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function debugCrossThreadOrchestrations() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log('🔍 Checking for cross-thread orchestration issues...\n')
  
  // Get all recent orchestration sessions
  const { data: sessions } = await supabase
    .from('orchestration_sessions')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 3600000).toISOString())
    .order('created_at', { ascending: false })
  
  if (!sessions) {
    console.log('No sessions found')
    return
  }
  
  // Group by thread
  const threadMap = new Map<string, any[]>()
  const noThreadSessions: any[] = []
  
  sessions.forEach(session => {
    const threadId = session.tool_state?.thread_id
    if (threadId) {
      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, [])
      }
      threadMap.get(threadId)!.push(session)
    } else {
      noThreadSessions.push(session)
    }
  })
  
  console.log(`Found ${sessions.length} sessions across ${threadMap.size} threads\n`)
  
  // Check each thread
  for (const [threadId, threadSessions] of threadMap) {
    console.log(`\nThread: ${threadId}`)
    console.log(`Sessions: ${threadSessions.length}`)
    
    // Check for active sessions
    const activeSessions = threadSessions.filter(s => 
      ['pending', 'running', 'resuming'].includes(s.status)
    )
    
    if (activeSessions.length > 1) {
      console.log(`⚠️  WARNING: ${activeSessions.length} active sessions in same thread!`)
      activeSessions.forEach(s => {
        console.log(`   - ${s.id}: ${s.status} (created: ${s.created_at})`)
      })
    }
    
    // Check messages for this thread
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('id, role, metadata')
      .eq('thread_id', threadId)
      .eq('role', 'assistant')
    
    const messagesWithOrchestration = messages?.filter(m => 
      m.metadata?.orchestration_session_id
    ) || []
    
    console.log(`Assistant messages: ${messages?.length || 0}`)
    console.log(`With orchestration ID: ${messagesWithOrchestration.length}`)
    
    // Check for orphaned sessions (no corresponding message)
    const completedSessions = threadSessions.filter(s => s.status === 'completed')
    const sessionIds = new Set(completedSessions.map(s => s.id))
    const messageSessionIds = new Set(
      messagesWithOrchestration.map(m => m.metadata.orchestration_session_id)
    )
    
    const orphanedSessions = [...sessionIds].filter(id => !messageSessionIds.has(id))
    if (orphanedSessions.length > 0) {
      console.log(`⚠️  ${orphanedSessions.length} completed sessions without messages:`)
      orphanedSessions.forEach(id => {
        const session = completedSessions.find(s => s.id === id)
        console.log(`   - ${id} (${session?.created_at})`)
      })
    }
  }
  
  if (noThreadSessions.length > 0) {
    console.log(`\n⚠️  ${noThreadSessions.length} sessions without thread_id:`)
    noThreadSessions.forEach(s => {
      console.log(`   - ${s.id}: ${s.status}`)
    })
  }
}

debugCrossThreadOrchestrations().catch(console.error)