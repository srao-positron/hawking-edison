#!/usr/bin/env npx tsx
/**
 * Debug API request to see exactly what's being sent
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import chalk from 'chalk'

config({ path: resolve(process.cwd(), '.env.local') })

async function debugApiRequest() {
  console.log(chalk.blue('🔍 Debugging API Request Flow...\n'))

  // First, get the user's auth token by signing in
  const signInResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    },
    body: JSON.stringify({
      email: 'siddhartha.s.rao@gmail.com',
      password: 'Ctigroup1@'
    })
  })

  if (!signInResponse.ok) {
    console.error(chalk.red('Failed to sign in'))
    return
  }

  const authData = await signInResponse.json()
  console.log(chalk.green('✓ Signed in successfully'))
  console.log(chalk.gray(`User ID: ${authData.user.id}`))

  // Create the exact payload that the API route would send
  const apiPayload = {
    input: "Hello, can you help me?",
    provider: undefined,
    context: undefined,
    mode: 'sync'
  }

  console.log(chalk.yellow('\n1. API Route Payload:'))
  console.log(JSON.stringify(apiPayload, null, 2))

  // What the API route adds
  const edgeFunctionPayload = {
    ...apiPayload,
    userId: authData.user.id
  }

  console.log(chalk.yellow('\n2. Edge Function Payload (what API route sends):'))
  console.log(JSON.stringify(edgeFunctionPayload, null, 2))

  // Call Edge Function directly
  console.log(chalk.yellow('\n3. Calling Edge Function directly...'))
  
  const edgeResponse = await fetch(
    `${process.env.NEXT_PUBLIC_EDGE_FUNCTIONS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/interact`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(edgeFunctionPayload)
    }
  )

  console.log(chalk.gray(`Status: ${edgeResponse.status}`))
  const responseText = await edgeResponse.text()
  
  try {
    const responseData = JSON.parse(responseText)
    console.log(chalk.gray('Response:'))
    console.log(JSON.stringify(responseData, null, 2))
    
    if (!responseData.success && responseData.error) {
      console.log(chalk.red(`\nError: ${responseData.error.code} - ${responseData.error.message}`))
    }
  } catch (e) {
    console.log(chalk.red('Raw response:'))
    console.log(responseText)
  }

  // Also check what happens without userId
  console.log(chalk.yellow('\n4. Testing without userId (as API might be doing):'))
  
  const withoutUserIdResponse = await fetch(
    `${process.env.NEXT_PUBLIC_EDGE_FUNCTIONS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/interact`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiPayload)
    }
  )

  console.log(chalk.gray(`Status: ${withoutUserIdResponse.status}`))
  const withoutUserIdText = await withoutUserIdResponse.text()
  
  try {
    const withoutUserIdData = JSON.parse(withoutUserIdText)
    if (!withoutUserIdData.success) {
      console.log(chalk.red(`Error: ${withoutUserIdData.error.code} - ${withoutUserIdData.error.message}`))
    }
  } catch (e) {
    console.log(chalk.red('Raw response:'))
    console.log(withoutUserIdText)
  }

  // Check recent interactions
  console.log(chalk.yellow('\n5. Checking recent interactions...'))
  
  const interactionsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/interactions?user_id=eq.${authData.user.id}&order=created_at.desc&limit=3`,
    {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      }
    }
  )

  if (interactionsResponse.ok) {
    const interactions = await interactionsResponse.json()
    console.log(chalk.green(`Found ${interactions.length} recent interactions`))
    interactions.forEach((i: any) => {
      console.log(chalk.gray(`- ${i.id}: ${i.input?.substring(0, 30)}... (${new Date(i.created_at).toLocaleString()})`))
    })
  }
}

debugApiRequest().catch(console.error)