#!/usr/bin/env node
/**
 * Test Supabase Realtime functionality with tasks
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testRealtimeUpdates() {
  console.log('🧪 Testing Supabase Realtime with tasks...\n')

  // Subscribe to task updates
  console.log('📡 Setting up realtime subscription...')
  
  const channel = supabase
    .channel('test-tasks')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
      },
      (payload) => {
        console.log('\n🔔 Realtime event received!')
        console.log('Event type:', payload.eventType)
        console.log('Task:', JSON.stringify(payload.new || payload.old, null, 2))
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status)
    })

  // Wait for subscription to be ready
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Create a test task
  console.log('\n📝 Creating test task...')
  const { data: task, error: createError } = await supabase
    .from('tasks')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000', // Test user ID
      type: 'simulation',
      config: {
        agents: 3,
        topic: 'Realtime test',
        rounds: 2,
      },
      status: 'pending',
    })
    .select()
    .single()

  if (createError) {
    console.error('❌ Failed to create task:', createError)
    await cleanup(channel)
    return
  }

  console.log('✅ Task created:', task.id)

  // Simulate status updates like Lambda would do
  const updates = [
    { status: 'queued', progress: 0 },
    { status: 'processing', progress: 0.25, started_at: new Date().toISOString() },
    { status: 'processing', progress: 0.5, current_round: 1 },
    { status: 'processing', progress: 0.75, current_round: 2 },
    {
      status: 'completed',
      progress: 1,
      completed_at: new Date().toISOString(),
      result: {
        rounds: [
          { round: 1, content: 'Test round 1 results' },
          { round: 2, content: 'Test round 2 results' },
        ],
        totalRounds: 2,
      },
    },
  ]

  console.log('\n⏳ Simulating task processing updates...')
  for (const update of updates) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    console.log(`\n📤 Updating task to ${update.status}...`)
    const { error: updateError } = await supabase
      .from('tasks')
      .update(update)
      .eq('id', task.id)

    if (updateError) {
      console.error('❌ Update failed:', updateError)
    } else {
      console.log('✅ Update sent')
    }
  }

  // Wait for final updates
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Test error scenario
  console.log('\n🔴 Testing error scenario...')
  const { data: errorTask } = await supabase
    .from('tasks')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      type: 'simulation',
      config: { agents: 1, topic: 'Error test' },
      status: 'pending',
    })
    .select()
    .single()

  if (errorTask) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    await supabase
      .from('tasks')
      .update({
        status: 'failed',
        error: 'Simulated error for testing',
        failed_at: new Date().toISOString(),
      })
      .eq('id', errorTask.id)
  }

  // Wait and cleanup
  await new Promise((resolve) => setTimeout(resolve, 3000))
  await cleanup(channel)
}

async function cleanup(channel: any) {
  console.log('\n🧹 Cleaning up...')
  
  // Unsubscribe from channel
  await supabase.removeChannel(channel)
  
  // Optional: Delete test tasks
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('user_id', '00000000-0000-0000-0000-000000000000')
  
  if (!error) {
    console.log('✅ Test tasks deleted')
  }
  
  console.log('✅ Done!')
  process.exit(0)
}

// Run the test
testRealtimeUpdates().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})