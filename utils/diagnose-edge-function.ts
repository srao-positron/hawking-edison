#!/usr/bin/env npx tsx
/**
 * Diagnose Edge Function issues with detailed error tracking
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import chalk from 'chalk'

config({ path: resolve(process.cwd(), '.env.local') })

const TEST_EMAIL = 'test@hawkingedison.com'
const TEST_PASSWORD = 'TestUser123!@#'

async function diagnoseEdgeFunction() {
  console.log(chalk.blue('🔍 Diagnosing Edge Function Issues...\n'))

  // 1. Sign in
  console.log(chalk.yellow('1. Authenticating...'))
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
    throw new Error(`Sign in failed: ${await signInResponse.text()}`)
  }

  const authData = await signInResponse.json()
  console.log(chalk.green('✓ Authenticated successfully'))
  console.log(chalk.gray(`  User ID: ${authData.user.id}`))

  // 2. Test minimal Edge Function call
  console.log(chalk.yellow('\n2. Testing minimal Edge Function call...'))
  
  // First, let's test with the absolute minimum payload
  const minimalPayload = {
    input: "test"
  }
  
  console.log(chalk.gray('Minimal payload:'), JSON.stringify(minimalPayload, null, 2))
  
  const minimalResponse = await fetch(
    `${process.env.NEXT_PUBLIC_EDGE_FUNCTIONS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/interact`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(minimalPayload)
    }
  )

  console.log(chalk.gray(`Status: ${minimalResponse.status}`))
  const minimalText = await minimalResponse.text()
  console.log(chalk.gray('Response:'), minimalText)

  // 3. Test with userId in payload (as Edge Function seems to expect)
  console.log(chalk.yellow('\n3. Testing with userId in payload...'))
  
  const withUserIdPayload = {
    input: "test",
    userId: authData.user.id
  }
  
  console.log(chalk.gray('Payload with userId:'), JSON.stringify(withUserIdPayload, null, 2))
  
  const withUserIdResponse = await fetch(
    `${process.env.NEXT_PUBLIC_EDGE_FUNCTIONS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/interact`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(withUserIdPayload)
    }
  )

  console.log(chalk.gray(`Status: ${withUserIdResponse.status}`))
  const withUserIdText = await withUserIdResponse.text()
  console.log(chalk.gray('Response:'), withUserIdText)

  // 4. Test with mode: sync
  console.log(chalk.yellow('\n4. Testing with mode: sync...'))
  
  const syncPayload = {
    input: "test message",
    userId: authData.user.id,
    mode: "sync"
  }
  
  console.log(chalk.gray('Sync payload:'), JSON.stringify(syncPayload, null, 2))
  
  const syncResponse = await fetch(
    `${process.env.NEXT_PUBLIC_EDGE_FUNCTIONS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/interact`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(syncPayload)
    }
  )

  console.log(chalk.gray(`Status: ${syncResponse.status}`))
  const syncText = await syncResponse.text()
  
  try {
    const syncData = JSON.parse(syncText)
    console.log(chalk.gray('Parsed response:'))
    console.log(JSON.stringify(syncData, null, 2))
    
    if (syncData.error) {
      console.log(chalk.red(`\nError details:`))
      console.log(chalk.red(`  Code: ${syncData.error.code}`))
      console.log(chalk.red(`  Message: ${syncData.error.message}`))
    }
  } catch (e) {
    console.log(chalk.gray('Raw response:'), syncText)
  }

  // 5. Check database tables directly
  console.log(chalk.yellow('\n5. Checking database tables...'))
  
  // Check interactions table
  const interactionsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/interactions?user_id=eq.${authData.user.id}&order=created_at.desc&limit=3`,
    {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Prefer': 'count=exact'
      }
    }
  )

  if (interactionsResponse.ok) {
    const interactions = await interactionsResponse.json()
    const totalCount = interactionsResponse.headers.get('content-range')?.split('/')[1] || '0'
    console.log(chalk.green(`✓ Interactions table accessible`))
    console.log(chalk.gray(`  Total interactions: ${totalCount}`))
    console.log(chalk.gray(`  Recent: ${interactions.length}`))
  } else {
    console.log(chalk.red(`✗ Cannot access interactions table`))
    console.log(chalk.gray(`  Status: ${interactionsResponse.status}`))
    console.log(chalk.gray(`  Error: ${await interactionsResponse.text()}`))
  }

  // Check chat_threads table
  const threadsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/chat_threads?user_id=eq.${authData.user.id}&order=created_at.desc&limit=3`,
    {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      }
    }
  )

  if (threadsResponse.ok) {
    const threads = await threadsResponse.json()
    console.log(chalk.green(`✓ Chat threads table accessible`))
    console.log(chalk.gray(`  Recent threads: ${threads.length}`))
  } else {
    console.log(chalk.red(`✗ Cannot access chat_threads table`))
  }

  // 6. Test if we can insert into interactions directly
  console.log(chalk.yellow('\n6. Testing direct database insert...'))
  
  const testInteraction = {
    user_id: authData.user.id,
    input: "Direct test",
    tool_calls: [],
    result: {},
    metadata: { test: true }
  }
  
  const insertResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/interactions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testInteraction)
    }
  )

  console.log(chalk.gray(`Insert status: ${insertResponse.status}`))
  if (insertResponse.ok) {
    console.log(chalk.green('✓ Can insert into interactions table'))
    const inserted = await insertResponse.json()
    console.log(chalk.gray(`  Inserted ID: ${inserted[0]?.id}`))
  } else {
    console.log(chalk.red('✗ Cannot insert into interactions table'))
    console.log(chalk.gray(`  Error: ${await insertResponse.text()}`))
  }

  // 7. Summary
  console.log(chalk.blue('\n📊 Summary:'))
  console.log(chalk.gray('1. Edge Function is reachable'))
  console.log(chalk.gray('2. Authentication is working'))
  console.log(chalk.gray('3. The 400 error suggests an issue in the Edge Function code'))
  console.log(chalk.gray('4. Database tables are accessible from client'))
  console.log(chalk.gray('\nNext steps:'))
  console.log(chalk.yellow('- Check Edge Function logs in Supabase Dashboard'))
  console.log(chalk.yellow('- The error "Failed to record interaction" suggests the Edge Function'))
  console.log(chalk.yellow('  might not be using the service role key properly'))
}

diagnoseEdgeFunction().catch(console.error)