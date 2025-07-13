#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function testMCPEnumeration() {
  console.log('🧪 Testing MCP Tool Enumeration...\n')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Get the GitHub server for test user
    const testUserId = '0b9fcefa-ba51-470b-b787-5a41f329be25'
    
    const { data: servers, error } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('user_id', testUserId)
      .eq('oauth_provider', 'github')
      .single()
    
    if (error || !servers) {
      console.log('❌ No GitHub MCP server found. It seems the OAuth connection was not saved.')
      console.log('   This might be because you connected while logged in as a different user.')
      console.log('\nLet\'s check which user has the GitHub connection:')
      
      // Check all GitHub servers
      const { data: allGithubServers } = await supabase
        .from('mcp_servers')
        .select('*, user:auth.users!user_id(email)')
        .eq('oauth_provider', 'github')
      
      if (allGithubServers && allGithubServers.length > 0) {
        console.log('\n📋 GitHub servers found:')
        allGithubServers.forEach(server => {
          console.log(`   - ${server.name} (User: ${server.user?.email || 'Unknown'})`)
        })
      } else {
        console.log('   No GitHub servers found in the database')
      }
      
      return
    }
    
    console.log(`✅ Found GitHub server: ${servers.name}`)
    console.log(`   ID: ${servers.id}`)
    
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
          serverId: servers.id,
          user: { id: testUserId }
        }),
      }
    )
    
    const result = await response.json()
    console.log('   Response:', response.status, result)
    
    // Check enumerated tools
    const { data: tools } = await supabase
      .from('mcp_tools')
      .select('*')
      .eq('mcp_server_id', servers.id)
    
    console.log(`\n🛠️  Tools enumerated: ${tools?.length || 0}`)
    
    if (tools && tools.length > 0) {
      console.log('\nSample tools:')
      tools.slice(0, 10).forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description || '(no description)'}`)
      })
      
      if (tools.length > 10) {
        console.log(`   ... and ${tools.length - 10} more`)
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testMCPEnumeration()