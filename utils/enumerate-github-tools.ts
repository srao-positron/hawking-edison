#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function enumerateGitHubTools() {
  console.log('🔄 Enumerating GitHub MCP Tools...\n')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Get your GitHub server
    const yourUserId = '9354bff8-726c-45fe-811b-a7a72471e934'
    
    const { data: server, error } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('user_id', yourUserId)
      .eq('oauth_provider', 'github')
      .single()
    
    if (error || !server) {
      console.error('❌ GitHub server not found:', error)
      return
    }
    
    console.log(`✅ Found GitHub server: ${server.name}`)
    console.log(`   ID: ${server.id}`)
    console.log(`   Last Connected: ${server.last_connected_at || 'Never'}`)
    
    // Call the Edge Function to enumerate tools
    console.log('\n🔄 Calling tool enumeration Edge Function...')
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mcp-enumerate-tools`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          serverId: server.id,
          user: { id: yourUserId }
        }),
      }
    )
    
    const result = await response.json()
    console.log('   Response:', response.status, result)
    
    if (!response.ok) {
      console.error('❌ Enumeration failed:', result)
      
      // Update server with error
      await supabase
        .from('mcp_servers')
        .update({ 
          connection_error: result.error || 'Tool enumeration failed',
          last_connected_at: new Date().toISOString()
        })
        .eq('id', server.id)
      
      return
    }
    
    // Wait a moment for database updates
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Check enumerated tools
    const { data: tools, error: toolsError } = await supabase
      .from('mcp_tools')
      .select('*')
      .eq('mcp_server_id', server.id)
      .order('name')
    
    console.log(`\n🛠️  Tools enumerated: ${tools?.length || 0}`)
    
    if (tools && tools.length > 0) {
      // Group tools by category
      const categories: Record<string, typeof tools> = {}
      tools.forEach(tool => {
        const cat = tool.category || 'other'
        if (!categories[cat]) categories[cat] = []
        categories[cat].push(tool)
      })
      
      console.log('\n📋 Tools by category:')
      Object.entries(categories).forEach(([category, categoryTools]) => {
        console.log(`\n   ${category.toUpperCase()} (${categoryTools.length}):`)
        categoryTools.forEach(tool => {
          console.log(`      - ${tool.name}: ${tool.description || '(no description)'}`)
        })
      })
    }
    
    // Check data sources
    const { data: dataSources } = await supabase
      .from('mcp_data_sources')
      .select('*')
      .eq('mcp_server_id', server.id)
    
    if (dataSources && dataSources.length > 0) {
      console.log(`\n📊 Data Sources: ${dataSources.length}`)
      dataSources.forEach(source => {
        console.log(`   - ${source.name}: ${source.description || '(no description)'}`)
      })
    }

    console.log('\n✅ Enumeration complete!')

  } catch (error) {
    console.error('❌ Enumeration failed:', error)
  }
}

// Run the enumeration
enumerateGitHubTools()