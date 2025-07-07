#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment')
  process.exit(1)
}

async function applyMigration() {
  console.log('🔄 Applying orchestration migration...\n')

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250107_orchestration.sql')
    const migrationSql = readFileSync(migrationPath, 'utf-8')

    // Split by statements (simple split by semicolon at end of line)
    const statements = migrationSql
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';')

    console.log(`Found ${statements.length} SQL statements to execute\n`)

    // Execute using Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip comments
      if (statement.trim().startsWith('--')) {
        continue
      }

      console.log(`Executing statement ${i + 1}...`)
      console.log(statement.substring(0, 60) + '...')

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).single()

      if (error) {
        // Check if it's a "already exists" error which we can ignore
        if (error.message?.includes('already exists')) {
          console.log('⚠️  Already exists, skipping...')
        } else {
          console.error('❌ Error:', error)
          throw error
        }
      } else {
        console.log('✅ Success\n')
      }
    }

    console.log('✅ Migration applied successfully!')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
applyMigration()