#!/usr/bin/env tsx
/**
 * Apply thread management schema migration to Supabase
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create admin client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🚀 Applying thread management schema migration...')

  try {
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('orchestration_sessions')
      .select('id')
      .limit(1)

    if (testError) {
      console.error('❌ Failed to connect to database:', testError.message)
      return
    }

    console.log('✅ Connected to Supabase')

    // Since we can't execute raw SQL directly, we'll need to use the Supabase Dashboard
    // or create the tables using the Supabase client methods
    console.log(`
📝 Migration SQL has been generated at:
   supabase/migrations/20250111_thread_management.sql

To apply this migration:

1. Go to the Supabase Dashboard:
   https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/sql/new

2. Copy and paste the SQL from the migration file

3. Click "Run" to execute the migration

Alternatively, you can use the Supabase CLI once it's properly configured:
   npx supabase db push --db-url "postgresql://postgres:${process.env.DATABASE_PASSWORD}@db.bknpldydmkzupsfagnva.supabase.co:5432/postgres"
`)

    // Let's at least verify what tables currently exist
    const { data: tables } = await supabase.rpc('get_tables', {})
    console.log('\n📊 Current tables:', tables?.map((t: any) => t.table_name).join(', '))

  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

// Helper function to check if tables exist (if RPC function exists)
async function checkTables() {
  try {
    // Try to query information_schema
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
    
    console.log('\n📋 Checking existing tables...')
    
    // Unfortunately, we can't execute raw SQL without an RPC function
    // Let's try to check specific tables
    const tablesToCheck = ['threads', 'messages', 'agent_conversations', 'visualizations']
    
    for (const table of tablesToCheck) {
      try {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
        console.log(`✅ Table '${table}' exists`)
      } catch {
        console.log(`❌ Table '${table}' does not exist`)
      }
    }
  } catch (error) {
    console.log('Could not check tables:', error)
  }
}

async function main() {
  await applyMigration()
  await checkTables()
  
  console.log(`
📌 Next steps:
1. Apply the migration using the Supabase Dashboard
2. Run 'npx tsx utils/sync-database-types.ts' to update TypeScript types
3. Start implementing the thread management Edge Functions
`)
}

main().catch(console.error)