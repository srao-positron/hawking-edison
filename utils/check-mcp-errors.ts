#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRole)

async function checkMCPErrors() {
  console.log('Checking MCP execution logs for errors...\n')

  // Get recent MCP execution logs with errors
  const { data: errorLogs, error } = await supabase
    .from('mcp_execution_logs')
    .select('*')
    .eq('status', 'error')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching logs:', error)
    return
  }

  if (!errorLogs || errorLogs.length === 0) {
    console.log('No error logs found in mcp_execution_logs')
    
    // Check for timeout logs
    const { data: timeoutLogs } = await supabase
      .from('mcp_execution_logs')
      .select('*')
      .eq('status', 'timeout')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (timeoutLogs && timeoutLogs.length > 0) {
      console.log('\nFound timeout logs:')
      timeoutLogs.forEach(log => {
        console.log(`\n- Tool: ${log.tool_name}`)
        console.log(`  Session: ${log.session_id}`)
        console.log(`  Duration: ${log.duration_ms}ms`)
        console.log(`  Request:`, JSON.stringify(log.request, null, 2))
      })
    }
    return
  }

  console.log(`Found ${errorLogs.length} error logs:\n`)

  errorLogs.forEach(log => {
    console.log(`Tool: ${log.tool_name}`)
    console.log(`Session: ${log.session_id}`)
    console.log(`Status: ${log.status}`)
    console.log(`Error: ${log.error}`)
    console.log(`Duration: ${log.duration_ms}ms`)
    console.log(`Request:`, JSON.stringify(log.request, null, 2))
    console.log(`Response:`, JSON.stringify(log.response, null, 2))
    console.log('---')
  })

  // Also check orchestration events for mcp_get_file_contents
  console.log('\nChecking orchestration events for mcp_get_file_contents...')
  
  const { data: events } = await supabase
    .from('orchestration_events')
    .select('*')
    .like('event_data', '%mcp_get_file_contents%')
    .order('created_at', { ascending: false })
    .limit(20)

  if (events && events.length > 0) {
    console.log(`\nFound ${events.length} orchestration events:`)
    events.forEach(event => {
      const data = event.event_data as any
      if (data.tool === 'mcp_get_file_contents' || data.error?.includes('mcp_get_file_contents')) {
        console.log(`\nEvent Type: ${event.event_type}`)
        console.log(`Session: ${event.session_id}`)
        console.log(`Data:`, JSON.stringify(data, null, 2))
      }
    })
  }
}

checkMCPErrors().catch(console.error)