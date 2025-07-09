#!/usr/bin/env tsx
/**
 * Database utility functions
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

/**
 * URL-encode a database password for use in connection strings
 * Special characters like @ need to be encoded
 */
export function encodeDbPassword(password: string): string {
  return encodeURIComponent(password)
}

/**
 * Build a PostgreSQL connection URL with proper encoding
 */
export function buildDatabaseUrl(
  host: string,
  database: string,
  user: string,
  password: string,
  port: number = 5432
): string {
  const encodedPassword = encodeDbPassword(password)
  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`
}

/**
 * Get Supabase database URL with encoded password
 */
export function getSupabaseDbUrl(): string {
  const password = process.env.DATABASE_PASSWORD || ''
  
  // Important: The password in .env.local is stored as plain text (Ctigroup1@)
  // We need to URL-encode it for use in connection strings
  return buildDatabaseUrl(
    'db.bknpldydmkzupsfagnva.supabase.co',
    'postgres',
    'postgres',
    password  // buildDatabaseUrl will encode this
  )
}

/**
 * Export encoded password as environment variable for tools that need it
 */
export function exportEncodedPassword(): void {
  const password = process.env.DATABASE_PASSWORD || ''
  const encoded = encodeDbPassword(password)
  process.env.DATABASE_PASSWORD_ENCODED = encoded
}

// CLI usage example
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args[0] === 'encode') {
    const password = args[1] || process.env.DATABASE_PASSWORD || ''
    console.log('Encoded password:', encodeDbPassword(password))
  } else if (args[0] === 'url') {
    console.log('Database URL:', getSupabaseDbUrl())
  } else {
    console.log(`
Database Utilities

Usage:
  npx tsx utils/database-utils.ts encode [password]  # URL-encode a password
  npx tsx utils/database-utils.ts url               # Get full database URL

Examples:
  npx tsx utils/database-utils.ts encode "Pass@word"
  npx tsx utils/database-utils.ts url

Note: If password is not provided, uses DATABASE_PASSWORD from environment
`)
  }
}