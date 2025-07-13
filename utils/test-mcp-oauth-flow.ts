#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function testMCPOAuthFlow() {
  console.log('🧪 Testing MCP OAuth Flow...\n')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1. Check if GitHub OAuth is configured
    const githubClientId = process.env.GITHUB_CLIENT_ID
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET
    
    if (!githubClientId || !githubClientSecret) {
      console.error('❌ GitHub OAuth not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env.local')
      return
    }
    
    console.log('✅ GitHub OAuth credentials found')
    console.log(`   Client ID: ${githubClientId.substring(0, 8)}...`)

    // 2. Get test user
    const { data: user } = await supabase.auth.admin.getUserById(
      '0b9fcefa-ba51-470b-b787-5a41f329be25' // Test user ID
    )
    
    if (!user) {
      console.error('❌ Test user not found')
      return
    }
    
    console.log('✅ Test user found:', user.user.email)

    // 3. Check for existing MCP servers
    const { data: servers, error: serversError } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('user_id', user.user.id)
    
    if (serversError) {
      console.error('❌ Failed to fetch MCP servers:', serversError)
      return
    }
    
    console.log(`\n📋 Existing MCP servers: ${servers?.length || 0}`)
    servers?.forEach(server => {
      console.log(`   - ${server.name} (${server.type}) - Active: ${server.is_active}`)
    })

    // 4. Check GitHub MCP server endpoint
    console.log('\n🔍 Checking GitHub MCP server endpoint...')
    const githubMcpUrl = 'https://api.githubcopilot.com/mcp/'
    
    try {
      const response = await fetch(githubMcpUrl + 'tools/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer FAKE_TOKEN_FOR_TESTING'
        },
        body: JSON.stringify({})
      })
      
      console.log(`   Response status: ${response.status}`)
      if (response.status === 401) {
        console.log('✅ GitHub MCP endpoint is reachable (requires valid token)')
      }
    } catch (error) {
      console.log('⚠️  Could not reach GitHub MCP endpoint:', error.message)
    }

    // 5. Generate OAuth URL
    const oauthUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${githubClientId}` +
      `&redirect_uri=${encodeURIComponent('http://localhost:3000/api/auth/github-mcp/callback')}` +
      `&scope=repo,read:user` +
      `&state=${crypto.randomUUID()}`
    
    console.log('\n🔗 GitHub OAuth URL:')
    console.log(oauthUrl)
    console.log('\nTo test the full flow:')
    console.log('1. Open the URL above in a browser while logged in as test@hawkingedison.com')
    console.log('2. Authorize the GitHub app')
    console.log('3. Check the MCP servers page to see if the server was added')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testMCPOAuthFlow()