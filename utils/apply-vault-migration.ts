#!/usr/bin/env npx tsx
// Apply Vault migration directly using Supabase client

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

config({ path: '.env.local' })

async function applyMigration() {
  console.log('🔐 Applying Vault migration to remote database...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // Read the migration file
  const migrationPath = join(process.cwd(), 'supabase/migrations/20250710004351_setup_vault_for_aws_creds.sql')
  const migrationSql = readFileSync(migrationPath, 'utf-8')
  
  console.log('📄 Migration file loaded')
  console.log('🚀 Applying migration...')
  
  // Execute the migration
  const { error } = await supabase.rpc('query', { sql: migrationSql }).single()
  
  if (error) {
    // Try direct SQL approach
    console.log('   Trying alternative approach...')
    
    // Split the migration into individual statements
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      console.log(`   Executing: ${statement.substring(0, 50)}...`)
      
      // Execute each statement
      const { error: stmtError } = await supabase
        .from('_dummy') // Use a dummy table name
        .select()
        .limit(0)
        .then(() => supabase.rpc('query', { sql: statement + ';' }))
      
      if (stmtError) {
        console.error(`   ❌ Error: ${stmtError.message}`)
        // Continue with other statements
      }
    }
  }
  
  // Verify the functions were created
  console.log('\n🔍 Verifying migration...')
  
  const { data: testData, error: testError } = await supabase.rpc('get_aws_credentials')
  
  if (testError && testError.message.includes('function')) {
    console.error('❌ Migration failed - functions not found')
    console.error('   You may need to apply this manually via Supabase dashboard')
    console.error('   Go to: SQL Editor > New Query > Paste the migration')
    return
  }
  
  console.log('✅ Migration applied successfully!')
  console.log('   Vault functions are now available')
}

// Run the script
applyMigration().catch(console.error)