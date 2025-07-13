#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function checkMCPConnection() {
  console.log('🔍 Checking MCP Connection Status...\n')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Get test user
    const testUserId = '0b9fcefa-ba51-470b-b787-5a41f329be25'
    
    // Check for MCP servers
    const { data: servers, error: serversError } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
    
    if (serversError) {
      console.error('❌ Failed to fetch MCP servers:', serversError)
      return
    }
    
    console.log(`📋 MCP Servers found: ${servers?.length || 0}`)
    
    for (const server of servers || []) {
      console.log(`\n🔌 Server: ${server.name}`)
      console.log(`   Type: ${server.type}`)
      console.log(`   OAuth: ${server.is_oauth ? 'Yes' : 'No'}`)
      console.log(`   Active: ${server.is_active ? 'Yes' : 'No'}`)
      console.log(`   Last Connected: ${server.last_connected_at || 'Never'}`)
      
      if (server.connection_error) {
        console.log(`   ⚠️  Error: ${server.connection_error}`)
      }
      
      // Check for OAuth token
      if (server.is_oauth) {
        const { data: token, error: tokenError } = await supabase
          .from('mcp_oauth_tokens')
          .select('id, expires_at, created_at')
          .eq('mcp_server_id', server.id)
          .single()
        
        if (token) {
          console.log(`   ✅ OAuth token present (created: ${new Date(token.created_at).toLocaleString()})`)
          if (token.expires_at) {
            console.log(`   ⏰ Token expires: ${new Date(token.expires_at).toLocaleString()}`)
          }
        } else {
          console.log(`   ❌ No OAuth token found`)
        }
      }
      
      // Check for tools
      const { data: tools, error: toolsError } = await supabase
        .from('mcp_tools')
        .select('*')
        .eq('mcp_server_id', server.id)
      
      console.log(`   🛠️  Tools: ${tools?.length || 0}`)
      
      if (tools && tools.length > 0) {
        // Group tools by category
        const categories = tools.reduce((acc, tool) => {
          const cat = tool.category || 'other'
          acc[cat] = (acc[cat] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        Object.entries(categories).forEach(([category, count]) => {
          console.log(`      - ${category}: ${count}`)
        })
        
        // Show first 5 tools
        console.log(`\n   📝 Sample tools:`)
        tools.slice(0, 5).forEach(tool => {
          console.log(`      - ${tool.name}: ${tool.description || '(no description)'}`)
        })
        
        if (tools.length > 5) {
          console.log(`      ... and ${tools.length - 5} more`)
        }
      }
      
      // Check for data sources
      const { data: dataSources, error: dataSourcesError } = await supabase
        .from('mcp_data_sources')
        .select('*')
        .eq('mcp_server_id', server.id)
      
      if (dataSources && dataSources.length > 0) {
        console.log(`\n   📊 Data Sources: ${dataSources.length}`)
        dataSources.slice(0, 3).forEach(source => {
          console.log(`      - ${source.name}: ${source.description || '(no description)'}`)
        })
      }
    }

    console.log('\n✅ MCP connection check complete!')

  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

// Run the check
checkMCPConnection()