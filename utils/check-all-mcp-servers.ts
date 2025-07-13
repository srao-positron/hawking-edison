#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function checkAllMCPServers() {
  console.log('🔍 Checking All MCP Servers...\n')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Get all MCP servers
    const { data: servers, error } = await supabase
      .from('mcp_servers')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Failed to fetch servers:', error)
      return
    }
    
    console.log(`📋 Total MCP Servers: ${servers?.length || 0}\n`)
    
    if (!servers || servers.length === 0) {
      console.log('No MCP servers found in the database.')
      return
    }
    
    for (const [index, server] of servers.entries()) {
      // Get user email
      const { data: user } = await supabase
        .from('auth.users')
        .select('email')
        .eq('id', server.user_id)
        .single()
      
      // Count tools and data sources
      const { count: toolCount } = await supabase
        .from('mcp_tools')
        .select('*', { count: 'exact', head: true })
        .eq('mcp_server_id', server.id)
      
      const { count: dataSourceCount } = await supabase
        .from('mcp_data_sources')
        .select('*', { count: 'exact', head: true })
        .eq('mcp_server_id', server.id)
      
      console.log(`${index + 1}. ${server.name}`)
      console.log(`   User: ${user?.email || 'Unknown'} (ID: ${server.user_id})`)
      console.log(`   Type: ${server.type}`)
      console.log(`   OAuth Provider: ${server.oauth_provider || 'None'}`)
      console.log(`   Active: ${server.is_active ? '✅' : '❌'}`)
      console.log(`   Created: ${new Date(server.created_at).toLocaleString()}`)
      
      if (server.last_connected_at) {
        console.log(`   Last Connected: ${new Date(server.last_connected_at).toLocaleString()}`)
      }
      
      console.log(`   Tools: ${toolCount || 0}`)
      console.log(`   Data Sources: ${dataSourceCount || 0}`)
      
      if (server.connection_error) {
        console.log(`   ⚠️  Error: ${server.connection_error}`)
      }
      
      console.log('')
    }
    
    // Check for OAuth tokens
    console.log('🔐 OAuth Tokens:')
    const { data: tokens } = await supabase
      .from('mcp_oauth_tokens')
      .select('*')
    
    if (tokens && tokens.length > 0) {
      for (const token of tokens) {
        const { data: server } = await supabase
          .from('mcp_servers')
          .select('name')
          .eq('id', token.mcp_server_id)
          .single()
        
        console.log(`   - ${server?.name || 'Unknown server'}: Token created ${new Date(token.created_at).toLocaleString()}`)
      }
    } else {
      console.log('   No OAuth tokens found')
    }

  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

// Run the check
checkAllMCPServers()