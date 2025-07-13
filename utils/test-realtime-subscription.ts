#!/usr/bin/env tsx
/**
 * Test realtime subscription to orchestration_sessions table
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

// Use anon key to simulate browser client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRealtimeSubscription() {
  try {
    console.log('Setting up realtime subscription...')
    
    const channel = supabase
      .channel('test-orchestration')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orchestration_sessions'
        },
        (payload) => {
          console.log('\n=== Realtime Event Received ===')
          console.log('Event Type:', payload.eventType)
          console.log('Timestamp:', new Date().toISOString())
          
          if (payload.new) {
            const session = payload.new as any
            console.log('Session ID:', session.id)
            console.log('Status:', session.status)
            console.log('Has final_response:', !!session.final_response)
            console.log('Final response length:', session.final_response?.length)
            
            // Check if final_response is being sent
            if (session.final_response) {
              console.log('Final response preview:', session.final_response.substring(0, 100) + '...')
            }
          }
          
          console.log('Raw payload.new keys:', Object.keys(payload.new || {}))
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })
    
    console.log('\nSubscribed! Create a new chat message to see realtime events.')
    console.log('Listening for orchestration_sessions updates...\n')
    
    // Keep the script running
    setTimeout(() => {
      console.log('\nUnsubscribing...')
      supabase.removeChannel(channel)
      process.exit(0)
    }, 120000) // 2 minutes
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testRealtimeSubscription()