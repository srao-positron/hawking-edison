#!/usr/bin/env npx tsx
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function testSNSPublish() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  // Sign in as test user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@hawkingedison.com',
    password: 'TestUser123!@#'
  })
  
  if (authError) {
    console.error('Auth failed:', authError)
    return
  }
  
  console.log('Authenticated as:', authData.user?.email)
  
  // Create a simple test message
  console.log('\nSending test message: "What is 2 + 2?"')
  
  const { data, error } = await supabase.functions.invoke('interact', {
    body: {
      input: 'What is 2 + 2?',
      userId: authData.user!.id
    }
  })
  
  if (error) {
    console.error('Edge Function error:', error)
    return
  }
  
  console.log('\nEdge Function response:', JSON.stringify(data, null, 2))
  
  // Check if orchestration was triggered
  if (data?.data?.sessionId) {
    console.log('\nOrchestration session created:', data.data.sessionId)
    console.log('Status:', data.data.status)
    
    // Monitor the session
    console.log('\nMonitoring session for 30 seconds...')
    
    const channel = supabase
      .channel(`test-orchestration:${data.data.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orchestration_sessions',
          filter: `id=eq.${data.data.sessionId}`
        },
        (payload) => {
          console.log('\nSession update:', payload.new)
        }
      )
      .subscribe()
    
    // Wait 30 seconds
    setTimeout(() => {
      console.log('\nTest complete')
      channel.unsubscribe()
      process.exit(0)
    }, 30000)
  } else {
    console.log('\nNo orchestration session was created')
    process.exit(1)
  }
}

testSNSPublish().catch(console.error)