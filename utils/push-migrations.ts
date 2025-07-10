#!/usr/bin/env npx tsx
/**
 * Push migrations to Supabase with proper password encoding
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import chalk from 'chalk'
import { execSync } from 'child_process'

config({ path: resolve(process.cwd(), '.env.local') })

async function pushMigrations() {
  console.log(chalk.blue('🚀 Pushing migrations to Supabase...\n'))

  // Get the database password from environment
  const dbPassword = process.env.SUPABASE_DB_PASSWORD
  
  if (!dbPassword) {
    console.log(chalk.red('❌ SUPABASE_DB_PASSWORD not found in .env.local'))
    console.log(chalk.yellow('Please add: SUPABASE_DB_PASSWORD=your_password'))
    process.exit(1)
  }

  // URL encode the password to handle special characters like @
  const encodedPassword = encodeURIComponent(dbPassword)
  
  console.log(chalk.gray('Original password length:', dbPassword.length))
  console.log(chalk.gray('Encoded password length:', encodedPassword.length))
  console.log(chalk.gray('Contains @:', dbPassword.includes('@') ? 'Yes' : 'No'))
  
  // Set the encoded password as an environment variable for supabase CLI
  process.env.SUPABASE_DB_PASSWORD = encodedPassword

  try {
    console.log(chalk.yellow('Running: supabase db push'))
    console.log(chalk.gray('(Using URL-encoded password for special characters)\n'))
    
    // Run supabase db push with the encoded password
    execSync('npx supabase db push', {
      stdio: 'inherit',
      env: {
        ...process.env,
        SUPABASE_DB_PASSWORD: encodedPassword
      }
    })
    
    console.log(chalk.green('\n✅ Migrations pushed successfully!'))
    
    // Now sync types
    console.log(chalk.yellow('\n🔄 Syncing database types...'))
    execSync('npx tsx utils/sync-database-types.ts', { stdio: 'inherit' })
    
    console.log(chalk.green('\n✅ All done! Your database is updated.'))
    
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to push migrations'))
    console.error(chalk.gray('Try running manually with:'))
    console.error(chalk.cyan(`SUPABASE_DB_PASSWORD="${encodedPassword}" npx supabase db push`))
  }
}

pushMigrations().catch(console.error)