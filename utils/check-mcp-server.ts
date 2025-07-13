#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRole)

async function checkMCPServer() {
  console.log('Checking GitHub MCP server configuration...\n')

  // Get GitHub MCP servers
  const { data: servers, error } = await supabase
    .from('mcp_servers')
    .select('*')
    .ilike('name', '%github%')

  if (error) {
    console.error('Error fetching servers:', error)
    return
  }

  if (!servers || servers.length === 0) {
    console.log('No GitHub MCP servers found')
    return
  }

  console.log(`Found ${servers.length} GitHub MCP server(s):\n`)

  for (const server of servers) {
    console.log(`Server: ${server.name}`)
    console.log(`ID: ${server.id}`)
    console.log(`User ID: ${server.user_id}`)
    console.log(`Type: ${server.type}`)
    console.log(`Active: ${server.is_active}`)
    console.log(`OAuth: ${server.is_oauth}`)
    console.log(`Config:`, JSON.stringify(server.config, null, 2))

    // Check if OAuth token exists
    if (server.is_oauth) {
      const { data: token } = await supabase
        .from('mcp_oauth_tokens')
        .select('access_token, expires_at')
        .eq('mcp_server_id', server.id)
        .single()

      if (token) {
        console.log(`OAuth Token: ${token.access_token ? 'Present' : 'Missing'}`)
        console.log(`Expires: ${token.expires_at || 'No expiry'}`)
        
        // Check if expired
        if (token.expires_at && new Date(token.expires_at) < new Date()) {
          console.log('⚠️  Token is EXPIRED')
        }
      } else {
        console.log('⚠️  No OAuth token found')
      }
    }

    // Check tools
    const { data: tools } = await supabase
      .from('mcp_tools')
      .select('name')
      .eq('mcp_server_id', server.id)
      .like('name', '%get_file_contents%')

    if (tools && tools.length > 0) {
      console.log(`\nget_file_contents tool: ✓ Found`)
    } else {
      console.log(`\nget_file_contents tool: ✗ Not found`)
    }
    
    console.log('---')
  }

  // Test the MCP server URL
  const testServer = servers[0]
  if (testServer && testServer.config?.servers) {
    const serverKey = Object.keys(testServer.config.servers)[0]
    const serverConfig = testServer.config.servers[serverKey]
    const url = serverConfig.url
    
    console.log(`\nTesting connection to: ${url}`)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...serverConfig.headers
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'rpc.discover',
          id: 1
        })
      })
      
      console.log(`Response status: ${response.status}`)
      const data = await response.json()
      console.log('Response:', JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('Connection test failed:', error)
    }
  }
}

checkMCPServer().catch(console.error)