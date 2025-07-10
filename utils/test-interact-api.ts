#!/usr/bin/env npx tsx
/**
 * Test the interact API endpoint
 * Usage: npx tsx utils/test-interact-api.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import chalk from 'chalk'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

// Test user credentials
const TEST_EMAIL = 'test@hawkingedison.com'
const TEST_PASSWORD = 'TestUser123!@#'

async function testInteractAPI() {
  try {
    console.log(chalk.blue('🧪 Testing Interact API...\n'))

    // 1. Sign in to get session
    console.log(chalk.yellow('1. Signing in...'))
    const signInResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    })

    if (!signInResponse.ok) {
      const error = await signInResponse.text()
      throw new Error(`Sign in failed: ${error}`)
    }

    const authData = await signInResponse.json()
    console.log(chalk.green('✓ Signed in successfully'))
    console.log(chalk.gray(`  User ID: ${authData.user.id}`))
    console.log(chalk.gray(`  Token: ${authData.access_token.substring(0, 20)}...`))

    // 2. Test direct Edge Function call
    console.log(chalk.yellow('\n2. Testing Edge Function directly...'))
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_EDGE_FUNCTIONS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/interact`
    
    const edgeResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: 'Hello, can you hear me?',
        userId: authData.user.id
      })
    })

    console.log(chalk.gray(`  Status: ${edgeResponse.status}`))
    const edgeData = await edgeResponse.text()
    console.log(chalk.gray(`  Response: ${edgeData.substring(0, 200)}...`))

    if (edgeResponse.ok) {
      const parsedEdgeData = JSON.parse(edgeData)
      console.log(chalk.green('✓ Edge Function responded'))
      console.log(chalk.gray(`  Success: ${parsedEdgeData.success}`))
      console.log(chalk.gray(`  Has data: ${!!parsedEdgeData.data}`))
      if (parsedEdgeData.data) {
        console.log(chalk.gray(`  Thread ID: ${parsedEdgeData.data.threadId}`))
        console.log(chalk.gray(`  Response: ${parsedEdgeData.data.response?.substring(0, 50)}...`))
      }
    } else {
      console.log(chalk.red('✗ Edge Function error'))
    }

    // 3. Test API route
    console.log(chalk.yellow('\n3. Testing API route...'))
    const apiUrl = 'http://localhost:3000/api/interact'
    
    // Create proper Supabase auth cookies
    const cookies = [
      `sb-bknpldydmkzupsfagnva-auth-token=${encodeURIComponent(JSON.stringify({
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
        provider_token: null,
        provider_refresh_token: null,
        user: authData.user
      }))}`,
      `sb-bknpldydmkzupsfagnva-auth-token.0=${encodeURIComponent(JSON.stringify({
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
        provider_token: null,
        provider_refresh_token: null,
        user: authData.user
      }))}`
    ].join('; ')
    
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        input: 'Test message through API route'
      })
    })

    console.log(chalk.gray(`  Status: ${apiResponse.status}`))
    const apiData = await apiResponse.text()
    console.log(chalk.gray(`  Response: ${apiData.substring(0, 200)}...`))

    if (apiResponse.ok) {
      const parsedApiData = JSON.parse(apiData)
      console.log(chalk.green('✓ API route responded'))
      console.log(chalk.gray(`  Has data: ${!!parsedApiData.data}`))
      if (parsedApiData.data) {
        console.log(chalk.gray(`  Thread ID: ${parsedApiData.data.threadId}`))
        console.log(chalk.gray(`  Response: ${parsedApiData.data.response?.substring(0, 50)}...`))
      }
    } else {
      console.log(chalk.red('✗ API route error'))
    }

    // 4. Check if threads were created
    console.log(chalk.yellow('\n4. Checking threads...'))
    const threadsResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/chat_threads?user_id=eq.${authData.user.id}&order=created_at.desc&limit=5`, {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      }
    })

    if (threadsResponse.ok) {
      const threads = await threadsResponse.json()
      console.log(chalk.green(`✓ Found ${threads.length} threads`))
      threads.forEach((thread: any, i: number) => {
        console.log(chalk.gray(`  ${i + 1}. ${thread.id} - Created: ${new Date(thread.created_at).toLocaleString()}`))
      })
    }

  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error)
    process.exit(1)
  }
}

// Run the test
testInteractAPI()