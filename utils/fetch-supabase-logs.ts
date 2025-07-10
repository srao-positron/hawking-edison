#!/usr/bin/env npx tsx
/**
 * Fetch logs from Supabase Edge Functions and Database
 * Usage: npx tsx utils/fetch-supabase-logs.ts [options]
 * 
 * Options:
 *   --function <name>  Filter by function name
 *   --limit <number>   Limit number of logs (default: 50)
 *   --error            Show only errors
 *   --since <minutes>  Show logs from last N minutes (default: 60)
 */

import { createClient } from '@supabase/supabase-js'
import { Command } from 'commander'
import { config } from 'dotenv'
import { resolve } from 'path'
import chalk from 'chalk'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(chalk.red('❌ Missing required environment variables'))
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  function_name?: string
  message: string
  metadata?: any
  request_id?: string
  status_code?: number
  execution_time_ms?: number
}

async function fetchLogs(options: {
  functionName?: string
  limit: number
  errorOnly: boolean
  sinceMinutes: number
}) {
  try {
    console.log(chalk.blue('🔍 Fetching Supabase logs...\n'))

    // Calculate timestamp for filtering
    const since = new Date(Date.now() - options.sinceMinutes * 60 * 1000).toISOString()

    // Fetch Edge Function logs
    console.log(chalk.yellow('📡 Edge Function Logs:'))
    console.log(chalk.gray('─'.repeat(80)))

    // Query edge function logs
    let query = supabase
      .from('edge_logs')
      .select('*')
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(options.limit)

    if (options.functionName) {
      query = query.eq('function_name', options.functionName)
    }

    if (options.errorOnly) {
      query = query.in('level', ['error', 'warn'])
    }

    const { data: edgeLogs, error: edgeError } = await query

    if (edgeError) {
      // Edge logs table might not exist, try alternative approach
      console.log(chalk.yellow('Note: Edge logs table not found. Logs might be in Supabase Dashboard only.'))
      console.log(chalk.gray('Visit: https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/logs/edge-functions'))
    } else if (edgeLogs && edgeLogs.length > 0) {
      displayLogs(edgeLogs)
    } else {
      console.log(chalk.gray('No edge function logs found'))
    }

    console.log('\n' + chalk.yellow('🗄️  Database Query Logs:'))
    console.log(chalk.gray('─'.repeat(80)))

    // Try to fetch database logs (if available)
    const { data: dbLogs, error: dbError } = await supabase
      .rpc('get_recent_queries', { 
        limit_count: options.limit,
        since_timestamp: since 
      })
      .limit(options.limit)

    if (dbError) {
      console.log(chalk.gray('Database query logs not available via API'))
      console.log(chalk.gray('Visit: https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/logs/postgres'))
    } else if (dbLogs && dbLogs.length > 0) {
      displayDatabaseLogs(dbLogs)
    } else {
      console.log(chalk.gray('No database logs found'))
    }

    // Provide dashboard links
    console.log('\n' + chalk.blue('📊 Supabase Dashboard Links:'))
    console.log(chalk.gray('─'.repeat(80)))
    console.log('Edge Functions: ' + chalk.cyan(`https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/logs/edge-functions`))
    console.log('Database Logs: ' + chalk.cyan(`https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/logs/postgres`))
    console.log('API Logs: ' + chalk.cyan(`https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/logs/postgrest`))

    // Also check for recent errors in our application tables
    console.log('\n' + chalk.yellow('🔴 Recent Application Errors:'))
    console.log(chalk.gray('─'.repeat(80)))

    const { data: interactions, error: interError } = await supabase
      .from('interactions')
      .select('id, created_at, input, error')
      .not('error', 'is', null)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10)

    if (interactions && interactions.length > 0) {
      interactions.forEach(interaction => {
        console.log(
          chalk.red('[ERROR]'),
          chalk.gray(new Date(interaction.created_at).toLocaleString()),
          chalk.white(`Input: "${interaction.input?.substring(0, 50)}..."`)
        )
        console.log(chalk.red('  Error:'), interaction.error)
      })
    } else {
      console.log(chalk.gray('No recent application errors found'))
    }

  } catch (error) {
    console.error(chalk.red('❌ Error fetching logs:'), error)
    process.exit(1)
  }
}

function displayLogs(logs: LogEntry[]) {
  logs.forEach(log => {
    const timestamp = new Date(log.timestamp).toLocaleString()
    const level = log.level.toUpperCase()
    const levelColor = 
      log.level === 'error' ? chalk.red :
      log.level === 'warn' ? chalk.yellow :
      log.level === 'debug' ? chalk.gray :
      chalk.blue

    console.log(
      levelColor(`[${level}]`),
      chalk.gray(timestamp),
      log.function_name ? chalk.cyan(`[${log.function_name}]`) : '',
      chalk.white(log.message)
    )

    if (log.metadata) {
      console.log(chalk.gray('  Metadata:'), JSON.stringify(log.metadata, null, 2))
    }

    if (log.execution_time_ms) {
      console.log(chalk.gray(`  Execution time: ${log.execution_time_ms}ms`))
    }
  })
}

function displayDatabaseLogs(logs: any[]) {
  logs.forEach(log => {
    console.log(
      chalk.blue('[QUERY]'),
      chalk.gray(new Date(log.timestamp).toLocaleString()),
      chalk.white(log.query?.substring(0, 100) + '...')
    )
    if (log.duration_ms) {
      console.log(chalk.gray(`  Duration: ${log.duration_ms}ms`))
    }
  })
}

// Parse command line arguments
const program = new Command()
  .option('-f, --function <name>', 'Filter by function name')
  .option('-l, --limit <number>', 'Limit number of logs', '50')
  .option('-e, --error', 'Show only errors')
  .option('-s, --since <minutes>', 'Show logs from last N minutes', '60')
  .parse()

const options = program.opts()

// Run the log fetcher
fetchLogs({
  functionName: options.function,
  limit: parseInt(options.limit),
  errorOnly: options.error || false,
  sinceMinutes: parseInt(options.since)
})