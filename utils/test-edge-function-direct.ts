#!/usr/bin/env npx tsx
/**
 * Test Edge Function directly with detailed logging
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import chalk from 'chalk'

config({ path: resolve(process.cwd(), '.env.local') })

const TEST_EMAIL = 'test@hawkingedison.com'
const TEST_PASSWORD = 'TestUser123!@#'

async function testEdgeFunction() {
  console.log(chalk.blue('🧪 Testing Edge Function directly...\n'))

  // 1. Sign in
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

  // 2. Test with different requests
  const testCases = [
    {
      name: 'Simple greeting',
      input: 'Hello, how are you?',
      mode: 'sync'
    },
    {
      name: 'Question',
      input: 'What is 2 + 2?',
      mode: 'sync'
    },
    {
      name: 'With thread ID',
      input: 'Remember this conversation',
      mode: 'sync',
      context: { sessionId: 'test-thread-123' }
    }
  ]

  for (const testCase of testCases) {
    console.log(chalk.yellow(`\n${testCase.name}:`))
    console.log(chalk.gray(`  Input: "${testCase.input}"`))
    console.log(chalk.gray(`  Mode: ${testCase.mode || 'default'}`))

    const body = {
      input: testCase.input,
      userId: authData.user.id,
      ...(testCase.mode && { mode: testCase.mode }),
      ...(testCase.context && { context: testCase.context })
    }

    console.log(chalk.gray('  Request body:'), JSON.stringify(body, null, 2))

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_EDGE_FUNCTIONS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/interact`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    )

    console.log(chalk.gray(`  Status: ${response.status}`))
    const responseText = await response.text()
    
    try {
      const data = JSON.parse(responseText)
      console.log(chalk.gray('  Response structure:'))
      console.log(chalk.gray(`    - success: ${data.success}`))
      console.log(chalk.gray(`    - has data: ${!!data.data}`))
      if (data.data) {
        console.log(chalk.gray(`    - data keys: ${Object.keys(data.data).join(', ')}`))
        if (data.data.response) {
          console.log(chalk.green(`    ✓ Got response: "${data.data.response.substring(0, 50)}..."`))
        } else if (data.data.sessionId) {
          console.log(chalk.yellow(`    ⚡ Got orchestration session: ${data.data.sessionId}`))
        }
      }
      if (data.error) {
        console.log(chalk.red(`    ✗ Error: ${data.error.message}`))
      }
    } catch (e) {
      console.log(chalk.red('  Failed to parse response:'))
      console.log(chalk.gray(responseText.substring(0, 200) + '...'))
    }
  }

  // 3. Check if any threads were created
  console.log(chalk.yellow('\n3. Checking threads...'))
  const threadsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/chat_threads?user_id=eq.${authData.user.id}&order=created_at.desc&limit=5`,
    {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      }
    }
  )

  if (threadsResponse.ok) {
    const threads = await threadsResponse.json()
    console.log(chalk.green(`✓ Found ${threads.length} threads`))
    if (threads.length > 0) {
      console.log(chalk.gray('  Recent threads:'))
      threads.slice(0, 3).forEach((thread: any, i: number) => {
        console.log(chalk.gray(`    ${i + 1}. ${thread.id.substring(0, 8)}... - ${new Date(thread.created_at).toLocaleString()}`))
      })
    }
  }
}

testEdgeFunction().catch(console.error)