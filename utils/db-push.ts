#!/usr/bin/env tsx
/**
 * Helper script to push database migrations with proper password encoding
 */

import { execSync } from 'child_process'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { getSupabaseDbUrl } from './database-utils'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

async function main() {
  const args = process.argv.slice(2)
  
  console.log('🚀 Pushing database migrations...\n')
  
  try {
    // Get database URL with encoded password
    const dbUrl = getSupabaseDbUrl()
    
    // Build command
    let command = `npx supabase db push --db-url "${dbUrl}"`
    
    // Add any additional arguments
    if (args.length > 0) {
      command += ' ' + args.join(' ')
    }
    
    console.log('📍 Using database URL with encoded password')
    console.log('🔄 Running migration...\n')
    
    // Execute command
    execSync(command, { stdio: 'inherit' })
    
    console.log('\n✅ Migration completed successfully!')
    console.log('\n📌 Next steps:')
    console.log('1. Run: npx tsx utils/sync-database-types.ts')
    console.log('2. Check for any TypeScript errors')
    console.log('3. Commit the updated types')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Show usage if --help
if (process.argv.includes('--help')) {
  console.log(`
Database Push Helper

This script pushes migrations to Supabase with proper password encoding.

Usage:
  npx tsx utils/db-push.ts [options]

Options:
  All options are passed through to 'supabase db push'
  
Examples:
  npx tsx utils/db-push.ts                    # Push all pending migrations
  npx tsx utils/db-push.ts --dry-run          # Preview what would be pushed
  npx tsx utils/db-push.ts --include-all      # Include all migrations

Note: This script automatically handles password encoding for special characters.
`)
  process.exit(0)
}

main().catch(console.error)