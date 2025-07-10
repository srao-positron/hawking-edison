#!/usr/bin/env npx tsx
// Check orchestration session status

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkOrchestration(sessionId?: string) {
  console.log('🔍 Checking orchestration sessions...\n')
  
  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  if (sessionId) {
    // Check specific session
    const { data, error } = await supabase
      .from('orchestration_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    
    if (error) {
      console.error('❌ Error fetching session:', error)
      return
    }
    
    console.log('📋 Session Details:')
    console.log(`  ID: ${data.id}`)
    console.log(`  Status: ${data.status}`)
    console.log(`  Created: ${data.created_at}`)
    console.log(`  Updated: ${data.updated_at}`)
    console.log(`  Started: ${data.started_at || 'Not started'}`)
    console.log(`  Messages: ${data.messages?.length || 0}`)
    console.log(`  Metadata:`, JSON.stringify(data.metadata, null, 2))
    
    if (data.result) {
      console.log('\n✅ Result:', JSON.stringify(data.result, null, 2))
    }
    
    if (data.error) {
      console.log('\n❌ Error:', data.error)
    }
  } else {
    // List recent sessions
    const { data: sessions, error } = await supabase
      .from('orchestration_sessions')
      .select('id, status, created_at, updated_at, metadata')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('❌ Error fetching sessions:', error)
      return
    }
    
    console.log(`📋 Recent ${sessions.length} sessions:\n`)
    
    for (const session of sessions) {
      const duration = session.updated_at 
        ? new Date(session.updated_at).getTime() - new Date(session.created_at).getTime()
        : 0
      
      console.log(`${getStatusEmoji(session.status)} ${session.id}`)
      console.log(`   Status: ${session.status}`)
      console.log(`   Created: ${new Date(session.created_at).toLocaleString()}`)
      console.log(`   Duration: ${duration > 0 ? `${Math.round(duration / 1000)}s` : 'N/A'}`)
      if (session.metadata?.thread_id) {
        console.log(`   Thread: ${session.metadata.thread_id}`)
      }
      console.log('')
    }
    
    // Check for issues
    const pendingSessions = sessions.filter(s => s.status === 'pending')
    const queuedSessions = sessions.filter(s => s.status === 'queued')
    const runningSessions = sessions.filter(s => s.status === 'running')
    
    console.log('\n📊 Summary:')
    console.log(`  Pending: ${pendingSessions.length}`)
    console.log(`  Queued: ${queuedSessions.length}`)
    console.log(`  Running: ${runningSessions.length}`)
    
    if (pendingSessions.length > 0) {
      console.warn('\n⚠️  There are pending sessions not being processed!')
      console.warn('This suggests the orchestration poller Lambda is not running.')
    }
    
    if (queuedSessions.length > 0) {
      console.warn('\n⚠️  There are queued sessions not being processed!')
      console.warn('This suggests the orchestration handler Lambda is not running.')
    }
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'pending': return '⏳'
    case 'queued': return '📋'
    case 'running': return '🔄'
    case 'completed': return '✅'
    case 'failed': return '❌'
    default: return '❓'
  }
}

// Get session ID from command line args
const sessionId = process.argv[2]

// Run the check
checkOrchestration(sessionId).catch(console.error)