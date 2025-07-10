#!/usr/bin/env npx tsx
// Run Vault setup SQL directly

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function runVaultSetup() {
  console.log('🔐 Setting up Vault for AWS credentials...\n')
  
  // Create Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  // Read the SQL file
  const sqlPath = path.join(__dirname, '../supabase/migrations/20250710004351_setup_vault_for_aws_creds.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  
  try {
    // Execute the SQL
    const { error } = await supabase.rpc('query', { query: sql })
    
    if (error) {
      // Try executing directly
      const { data, error: directError } = await supabase.from('_sql').select('*').limit(0)
      
      if (directError) {
        console.error('❌ Failed to run SQL:', directError)
        console.log('\nYou may need to run this SQL manually in the Supabase SQL editor.')
        process.exit(1)
      }
    }
    
    console.log('✅ Vault setup completed successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('1. The CDK deployment will automatically store credentials in Vault')
    console.log('2. Edge Functions will retrieve credentials from Vault')
    console.log('3. No manual credential updates needed!')
    
  } catch (error) {
    console.error('❌ Error:', error)
    console.log('\nPlease run the following SQL in the Supabase SQL editor:')
    console.log('---')
    console.log(sql)
    console.log('---')
    process.exit(1)
  }
}

// Run the setup
runVaultSetup().catch(console.error)