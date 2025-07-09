#!/usr/bin/env tsx
/**
 * Check if thread management tables exist in Supabase
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create admin client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkTables() {
  console.log('🔍 Checking for thread management tables...\n')

  const tablesToCheck = [
    'threads',
    'messages', 
    'agent_conversations',
    'thread_hierarchy',
    'llm_thoughts',
    'visualizations'
  ]

  for (const table of tablesToCheck) {
    try {
      // Try to query the table
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(0) // Just check if table exists, don't fetch data

      if (error) {
        console.log(`❌ Table '${table}' - Error: ${error.message}`)
      } else {
        console.log(`✅ Table '${table}' exists`)
      }
    } catch (err) {
      console.log(`❌ Table '${table}' - Exception: ${err}`)
    }
  }

  // Try to get table info using a raw SQL query
  console.log('\n📊 Checking table info via SQL...')
  
  try {
    // Check if we can query information schema
    const { data, error } = await supabase.rpc('get_table_info', {
      schema_name: 'public'
    }).select('*')

    if (error) {
      console.log('Could not query table info:', error.message)
    } else if (data) {
      console.log('Tables found:', data)
    }
  } catch (err) {
    console.log('RPC function not available')
  }
}

checkTables().catch(console.error)