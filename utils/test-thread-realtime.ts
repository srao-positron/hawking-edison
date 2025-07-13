#!/usr/bin/env tsx
/**
 * Test realtime updates for chat_threads table
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

async function testThreadRealtime() {
  try {
    // Get a recent thread to test with
    const { data: threads, error: threadsError } = await supabase
      .from('chat_threads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (threadsError || !threads || threads.length === 0) {
      console.error('No threads found to test with')
      return
    }
    
    const thread = threads[0]
    console.log(`Testing with thread: ${thread.id}`)
    console.log(`Current message count: ${thread.message_count}`)
    
    // Subscribe to updates
    console.log('\nSubscribing to realtime updates...')
    const channel = supabase
      .channel('test-thread-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_threads',
          filter: `id=eq.${thread.id}`
        },
        (payload) => {
          console.log('\n✅ Realtime UPDATE received!')
          console.log('Old:', payload.old)
          console.log('New:', payload.new)
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          // Once subscribed, update the thread
          updateThread()
        }
      })
    
    async function updateThread() {
      console.log('\nUpdating thread message count...')
      const newCount = (thread.message_count || 0) + 1
      
      const { error: updateError } = await supabase
        .from('chat_threads')
        .update({
          message_count: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', thread.id)
      
      if (updateError) {
        console.error('Failed to update thread:', updateError)
      } else {
        console.log(`Updated message_count to: ${newCount}`)
        console.log('Waiting for realtime event...')
      }
    }
    
    // Wait a bit to see the realtime update
    setTimeout(() => {
      console.log('\nTest complete. Unsubscribing...')
      supabase.removeChannel(channel)
      process.exit(0)
    }, 5000)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testThreadRealtime()