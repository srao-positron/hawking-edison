#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function testGitHubMCPDirect() {
  console.log('🧪 Testing GitHub MCP Server Directly...\n')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Get the GitHub server and token
    const yourUserId = '9354bff8-726c-45fe-811b-a7a72471e934'
    
    const { data: server } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('user_id', yourUserId)
      .eq('oauth_provider', 'github')
      .single()
    
    if (!server) {
      console.error('❌ GitHub server not found')
      return
    }
    
    // Get OAuth token
    const { data: token } = await supabase
      .from('mcp_oauth_tokens')
      .select('access_token')
      .eq('mcp_server_id', server.id)
      .single()
    
    if (!token) {
      console.error('❌ OAuth token not found')
      return
    }
    
    console.log('✅ Found GitHub server and token')
    console.log(`   Server URL: ${server.url}`)
    
    // Test different MCP endpoints
    const endpoints = [
      { path: 'tools/list', method: 'POST', body: {} },
      { path: 'list_tools', method: 'POST', body: {} },
      { path: '', method: 'POST', body: { jsonrpc: '2.0', method: 'tools/list', params: {}, id: 1 } },
      { path: '', method: 'POST', body: { jsonrpc: '2.0', method: 'list_tools', params: {}, id: 1 } },
    ]
    
    for (const endpoint of endpoints) {
      console.log(`\n🔍 Testing: ${server.url}${endpoint.path}`)
      console.log(`   Method: ${endpoint.method}`)
      console.log(`   Body: ${JSON.stringify(endpoint.body)}`)
      
      try {
        const response = await fetch(`${server.url}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.access_token}`,
            'Accept': 'application/json',
          },
          body: JSON.stringify(endpoint.body)
        })
        
        console.log(`   Status: ${response.status} ${response.statusText}`)
        
        const contentType = response.headers.get('content-type')
        console.log(`   Content-Type: ${contentType}`)
        
        if (contentType?.includes('application/json')) {
          const data = await response.json()
          console.log(`   Response: ${JSON.stringify(data, null, 2).substring(0, 500)}...`)
        } else {
          const text = await response.text()
          console.log(`   Response: ${text.substring(0, 200)}...`)
        }
      } catch (error) {
        console.error(`   Error: ${error}`)
      }
    }
    
    // Also test with regular GitHub API to verify token works
    console.log('\n🔍 Testing GitHub API with same token:')
    const githubResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Accept': 'application/json',
      }
    })
    
    if (githubResponse.ok) {
      const userData = await githubResponse.json()
      console.log(`   ✅ Token works! User: ${userData.login}`)
    } else {
      console.log(`   ❌ Token doesn't work with GitHub API: ${githubResponse.status}`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testGitHubMCPDirect()