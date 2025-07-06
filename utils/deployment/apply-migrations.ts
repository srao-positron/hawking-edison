#!/usr/bin/env tsx
// Apply database migrations to hosted Supabase

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'
import { readFileSync } from 'fs'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function applyMigrations() {
  console.log('📦 Applying database migrations...\n')
  
  try {
    // Read migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20240106_initial_schema.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('Migration file loaded. Length:', migrationSQL.length, 'characters')
    console.log('\n⚠️  This script cannot execute raw SQL through the Supabase client.')
    console.log('You need to manually run the migration in the Supabase Dashboard.\n')
    console.log('Steps:')
    console.log('1. Go to https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/sql')
    console.log('2. Click "New query"')
    console.log('3. Copy and paste the following SQL:')
    console.log('\n' + '='.repeat(60) + '\n')
    console.log('-- Initial schema migration')
    console.log(migrationSQL)
    console.log('\n' + '='.repeat(60) + '\n')
    console.log('4. Click "Run" to execute the migration')
    console.log('5. The tables and RLS policies will be created')
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

applyMigrations()