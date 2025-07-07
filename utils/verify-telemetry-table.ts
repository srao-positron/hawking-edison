#!/usr/bin/env node

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function verifyTable() {
  console.log('🔍 Verifying telemetry_events table...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Direct query to check if table exists
  const { data, error } = await supabase
    .from('telemetry_events')
    .select('*')
    .limit(1)

  if (error) {
    console.log('❌ Error querying telemetry_events:', error.message)
    console.log('   Code:', error.code)
    return
  }

  console.log('✅ telemetry_events table exists!')
  
  // Insert a test event
  console.log('\n📝 Inserting test event...')
  const { error: insertError } = await supabase
    .from('telemetry_events')
    .insert({
      event_type: 'test_verification',
      event_data: { test: true, timestamp: Date.now() },
      timestamp: new Date().toISOString()
    })

  if (insertError) {
    console.log('❌ Failed to insert:', insertError.message)
  } else {
    console.log('✅ Successfully inserted test event')
  }

  // Query back
  const { data: events, error: queryError } = await supabase
    .from('telemetry_events')
    .select('*')
    .eq('event_type', 'test_verification')
    .order('created_at', { ascending: false })
    .limit(5)

  if (queryError) {
    console.log('❌ Failed to query:', queryError.message)
  } else {
    console.log(`\n✅ Found ${events?.length || 0} test events`)
    if (events && events.length > 0) {
      console.log('Latest event:', JSON.stringify(events[0], null, 2))
    }
  }

  // Check the metrics view
  console.log('\n📊 Checking telemetry_metrics view...')
  const { data: metrics, error: metricsError } = await supabase
    .from('telemetry_metrics')
    .select('*')
    .limit(5)

  if (metricsError) {
    console.log('❌ Failed to query metrics view:', metricsError.message)
  } else {
    console.log(`✅ Metrics view accessible, found ${metrics?.length || 0} aggregated rows`)
  }

  // Cleanup
  await supabase
    .from('telemetry_events')
    .delete()
    .eq('event_type', 'test_verification')
}

verifyTable().catch(console.error)