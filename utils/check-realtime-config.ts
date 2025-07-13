#!/usr/bin/env tsx
/**
 * Check realtime configuration for tables
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRealtimeConfig() {
  try {
    console.log('Checking realtime configuration...\n')
    
    // Check if realtime is enabled for chat_threads table
    const { data: publications, error } = await supabase
      .rpc('pg_get_publication_tables', { publication_name: 'supabase_realtime' })
    
    if (error) {
      console.error('Error checking publications:', error)
      return
    }
    
    console.log('Tables with realtime enabled:')
    console.log(publications)
    
    // Test realtime subscription
    console.log('\nTesting realtime subscription for chat_threads...')
    const channel = supabase
      .channel('test-thread-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_threads'
        },
        (payload) => {
          console.log('Realtime event received:', payload)
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })
    
    // Wait a bit to see if subscription works
    setTimeout(() => {
      console.log('\nUnsubscribing from test channel...')
      supabase.removeChannel(channel)
      process.exit(0)
    }, 5000)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkRealtimeConfig()