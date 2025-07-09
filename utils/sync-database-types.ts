#!/usr/bin/env tsx

/**
 * Sync Database Types Tool
 * 
 * This tool:
 * 1. Generates TypeScript types from the Supabase database
 * 2. Validates that the types match the current codebase
 * 3. Updates any mismatched types
 * 
 * Usage: npx tsx utils/sync-database-types.ts
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const PROJECT_ID = 'bknpldydmkzupsfagnva'
const TYPES_FILE = join(process.cwd(), 'src/types/database.types.ts')
const BACKUP_FILE = join(process.cwd(), 'src/types/database.types.backup.ts')

async function main() {
  console.log('🔄 Syncing database types...\n')

  // Check for access token
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  if (!accessToken) {
    console.error('❌ Error: SUPABASE_ACCESS_TOKEN not found in .env.local')
    process.exit(1)
  }

  // Backup existing types
  if (existsSync(TYPES_FILE)) {
    const existingTypes = readFileSync(TYPES_FILE, 'utf8')
    writeFileSync(BACKUP_FILE, existingTypes)
    console.log('📦 Backed up existing types')
  }

  // Generate new types
  console.log('🔨 Generating types from Supabase...')
  try {
    execSync(
      `SUPABASE_ACCESS_TOKEN=${accessToken} npx supabase gen types typescript --project-id ${PROJECT_ID} --schema public > ${TYPES_FILE}`,
      { stdio: 'inherit' }
    )
  } catch (error) {
    console.error('❌ Failed to generate types:', error)
    // Restore backup
    if (existsSync(BACKUP_FILE)) {
      const backup = readFileSync(BACKUP_FILE, 'utf8')
      writeFileSync(TYPES_FILE, backup)
      console.log('🔄 Restored backup')
    }
    process.exit(1)
  }

  // Compare with backup
  if (existsSync(BACKUP_FILE)) {
    const newTypes = readFileSync(TYPES_FILE, 'utf8')
    const oldTypes = readFileSync(BACKUP_FILE, 'utf8')
    
    if (newTypes === oldTypes) {
      console.log('✅ Types are already up to date!')
    } else {
      console.log('📝 Types have been updated')
      
      // Extract table names that changed
      const tableRegex = /(\w+):\s*{[\s\S]*?Row:\s*{([\s\S]*?)}/g
      const oldTables = new Set([...oldTypes.matchAll(tableRegex)].map(m => m[1]))
      const newTables = new Set([...newTypes.matchAll(tableRegex)].map(m => m[1]))
      
      const added = [...newTables].filter(t => !oldTables.has(t))
      const removed = [...oldTables].filter(t => !newTables.has(t))
      
      if (added.length > 0) {
        console.log('  ➕ Added tables:', added.join(', '))
      }
      if (removed.length > 0) {
        console.log('  ➖ Removed tables:', removed.join(', '))
      }
      
      // Check for column changes in api_keys table specifically
      const apiKeysMatch = newTypes.match(/api_keys:\s*{[\s\S]*?Row:\s*{([\s\S]*?)}/m)
      if (apiKeysMatch) {
        console.log('\n📊 api_keys table columns:')
        const columns = apiKeysMatch[1].match(/(\w+):\s*[\w\s|]+/g)
        columns?.forEach(col => console.log('  -', col.trim()))
      }
    }
  }

  // Run TypeScript compiler to check for errors
  console.log('\n🔍 Checking for type errors...')
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' })
    console.log('✅ No type errors found!')
  } catch (error: any) {
    console.error('⚠️  Type errors found:')
    console.error(error.stdout?.toString() || error.message)
    console.log('\nPlease fix these type errors before committing.')
  }

  // Clean up backup
  if (existsSync(BACKUP_FILE)) {
    execSync(`rm ${BACKUP_FILE}`)
  }

  console.log('\n✨ Done! Database types are synced.')
  console.log('\n💡 Remember to:')
  console.log('1. Check for any TypeScript errors in your IDE')
  console.log('2. Update any code that uses modified types')
  console.log('3. Commit the updated types file')
}

// Run the tool
main().catch(console.error)