#!/usr/bin/env tsx
/**
 * Output migration SQL for manual application via Supabase Dashboard
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'

console.log(chalk.blue('🔧 Database Migrations Helper\n'))

// Find migration files
const migrations = [
  '20250710_add_interactions_metadata.sql',
  '20250710_edge_function_logs.sql'
].map(filename => {
  const path = resolve(process.cwd(), 'supabase/migrations', filename)
  if (!existsSync(path)) {
    console.log(chalk.red(`❌ Migration file not found: ${filename}`))
    return null
  }
  return {
    filename,
    content: readFileSync(path, 'utf-8')
  }
}).filter(Boolean)

if (migrations.length === 0) {
  console.log(chalk.red('No migration files found!'))
  process.exit(1)
}

console.log(chalk.yellow('📝 To apply these migrations:\n'))
console.log(chalk.cyan('1. Go to the Supabase SQL Editor:'))
console.log(`   https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/sql/new\n`)

console.log(chalk.cyan('2. Copy and paste the following SQL:\n'))

migrations.forEach((migration, index) => {
  console.log(chalk.gray(`${'='.repeat(80)}`))
  console.log(chalk.green(`-- Migration ${index + 1}: ${migration.filename}`))
  console.log(chalk.gray(`${'='.repeat(80)}`))
  console.log(migration.content)
  console.log()
})

console.log(chalk.cyan('3. Click "Run" to execute the migrations\n'))

console.log(chalk.cyan('4. After successful execution, run:'))
console.log(chalk.gray('   npx tsx utils/sync-database-types.ts\n'))

console.log(chalk.yellow('📌 Note about database password:'))
console.log(chalk.gray('   The password contains special characters (@) which causes issues'))
console.log(chalk.gray('   with connection strings. Using the SQL Editor avoids this problem.'))