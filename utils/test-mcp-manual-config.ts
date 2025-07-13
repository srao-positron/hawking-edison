#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function testManualMCPConfig() {
  console.log('🧪 Testing Manual MCP Configuration...\n')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Get test user
    const testUserId = '0b9fcefa-ba51-470b-b787-5a41f329be25'
    
    // Create a test MCP server with manual config
    const testConfig = {
      servers: {
        "test-echo": {
          type: "http",
          url: "https://echo.free.beeceptor.com/mcp/",
          headers: {
            "Authorization": "Bearer test-token-123"
          }
        }
      }
    }

    console.log('📝 Creating test MCP server...')
    
    const { data: server, error: serverError } = await supabase
      .from('mcp_servers')
      .upsert({
        user_id: testUserId,
        name: 'Test Echo Server',
        type: 'http',
        url: 'https://echo.free.beeceptor.com/mcp/',
        config: testConfig,
        is_oauth: false,
        is_active: true
      }, {
        onConflict: 'user_id,name'
      })
      .select()
      .single()

    if (serverError) {
      console.error('❌ Failed to create server:', serverError)
      return
    }

    console.log('✅ Test server created:', server.id)
    console.log(`   Name: ${server.name}`)
    console.log(`   Type: ${server.type}`)
    console.log(`   URL: ${server.url}`)

    // For now, skip enumeration since Edge Function isn't deployed
    console.log('\n⚠️  Tool enumeration requires Edge Function deployment')

    // Check for created tools
    const { data: tools, error: toolsError } = await supabase
      .from('mcp_tools')
      .select('*')
      .eq('mcp_server_id', server.id)

    if (toolsError) {
      console.error('❌ Failed to fetch tools:', toolsError)
    } else {
      console.log(`\n📋 Tools found: ${tools?.length || 0}`)
      tools?.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description || '(no description)'}`)
      })
    }

    console.log('\n✅ Test complete!')
    console.log('   You can now sign in as test@hawkingedison.com and check the MCP servers page')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testManualMCPConfig()