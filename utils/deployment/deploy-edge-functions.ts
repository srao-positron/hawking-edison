#!/usr/bin/env tsx
// Deploy Edge Functions using Supabase Management API

import { config } from 'dotenv'
import { join } from 'path'
import { readFileSync } from 'fs'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })

const PROJECT_REF = 'bknpldydmkzupsfagnva'
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN not found in environment variables')
  console.log('\nTo get your access token:')
  console.log('1. Go to https://supabase.com/dashboard/account/tokens')
  console.log('2. Create a new token')
  console.log('3. Add it to .env.local as SUPABASE_ACCESS_TOKEN=your-token')
  process.exit(1)
}

const API_BASE = 'https://api.supabase.com/v1'

// Functions to deploy
const FUNCTIONS = [
  'interact',
  'databank',
  'memories', 
  'auth-api-keys'
]

// Shared files that need to be included with each function
const SHARED_FILES = [
  'auth.ts',
  'llm.ts',
  'logger.ts',
  'response.ts'
]

async function createZipContent(functionName: string): Promise<string> {
  // For now, we'll use a simpler approach - deploy just the main file
  // The shared imports will need to be handled differently
  
  let mainFile = readFileSync(
    join(process.cwd(), `supabase/functions/${functionName}/index.ts`),
    'utf-8'
  )
  
  // Replace relative imports with the shared file contents
  for (const sharedFile of SHARED_FILES) {
    const importPattern = new RegExp(`from '../_shared/${sharedFile.replace('.ts', '')}'`, 'g')
    if (mainFile.includes(`../_shared/${sharedFile.replace('.ts', '')}`)) {
      const sharedContent = readFileSync(
        join(process.cwd(), `supabase/functions/_shared/${sharedFile}`),
        'utf-8'
      )
      // Remove the import line and add the content at the top
      mainFile = mainFile.replace(importPattern, `/* Inlined from _shared/${sharedFile} */`)
      mainFile = sharedContent.replace(/^export /gm, '') + '\n\n' + mainFile
    }
  }
  
  return mainFile
}

async function deployFunctionSimple(functionName: string) {
  console.log(`\n📦 Deploying ${functionName}...`)
  
  try {
    // Read the main function file
    const mainFile = readFileSync(
      join(process.cwd(), `supabase/functions/${functionName}/index.ts`),
      'utf-8'
    )
    
    // Use the dashboard API approach
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: functionName,
          slug: functionName,
          verify_jwt: true,
          import_map: true,
          entrypoint_path: 'index.ts',
          import_map_path: 'import_map.json',
          body: mainFile
        })
      }
    )
    
    const responseText = await response.text()
    
    if (response.ok) {
      console.log(`✅ ${functionName} deployed successfully!`)
      
      // Set environment variables
      await setFunctionSecrets(functionName)
    } else {
      console.error(`❌ Failed to deploy ${functionName}`)
      console.error(`   Status: ${response.status}`)
      console.error(`   Response: ${responseText}`)
      
      // Try alternative approach
      console.log(`   Trying alternative deployment method...`)
      await deployViaSQL(functionName)
    }
    
  } catch (error: any) {
    console.error(`❌ Error deploying ${functionName}: ${error.message}`)
  }
}

async function deployViaSQL(functionName: string) {
  console.log(`   Using SQL deployment for ${functionName}...`)
  
  console.log(`\n   ⚠️  Manual deployment required for ${functionName}`)
  console.log(`   1. Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/functions`)
  console.log(`   2. Click "New function"`)
  console.log(`   3. Name: ${functionName}`)
  console.log(`   4. Copy the code from: supabase/functions/${functionName}/index.ts`)
  console.log(`   5. Deploy the function`)
}

async function setFunctionSecrets(functionName: string) {
  console.log(`   Setting environment variables for ${functionName}...`)
  
  const secrets = [
    { name: 'ANTHROPIC_API_KEY', value: process.env.ANTHROPIC_API_KEY },
    { name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY }
  ]
  
  try {
    for (const secret of secrets) {
      if (!secret.value) continue
      
      const response = await fetch(
        `https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: secret.name,
            value: secret.value,
            // Associate with specific function
            function_slug: functionName
          })
        }
      )
      
      if (response.ok) {
        console.log(`   ✅ ${secret.name} set`)
      } else {
        const text = await response.text()
        console.log(`   ⚠️  ${secret.name} may already exist: ${response.status}`)
      }
    }
  } catch (error: any) {
    console.error(`   ❌ Error setting secrets: ${error.message}`)
  }
}

async function checkDeployment() {
  console.log('\n🔍 Checking deployed functions...')
  
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`
      }
    }
  )
  
  if (response.ok) {
    const functions = await response.json()
    console.log(`\n✅ Found ${functions.length} deployed functions:`)
    functions.forEach((f: any) => {
      console.log(`   - ${f.slug} (${f.status})`)
    })
  } else {
    console.error('❌ Failed to list functions')
  }
}

async function deployAll() {
  console.log('🚀 Deploying Edge Functions to Supabase...')
  console.log(`   Project: ${PROJECT_REF}`)
  console.log(`   Functions: ${FUNCTIONS.join(', ')}`)
  
  // Check current state
  await checkDeployment()
  
  console.log('\n⚠️  The Supabase Management API for Edge Functions deployment')
  console.log('   appears to have issues with multipart uploads.')
  console.log('\n📋 Manual deployment instructions:')
  console.log('\n1. Go to: https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/functions')
  console.log('2. For each function, click "New function" and create:')
  
  FUNCTIONS.forEach(func => {
    console.log(`\n   Function: ${func}`)
    console.log(`   - Name: ${func}`)
    console.log(`   - Copy code from: supabase/functions/${func}/index.ts`)
    console.log(`   - Also copy shared utilities from: supabase/functions/_shared/`)
    console.log(`   - Enable "Verify JWT" option`)
  })
  
  console.log('\n3. After creating all functions, set environment variables:')
  console.log('   - Click on each function')
  console.log('   - Go to "Settings" tab')
  console.log('   - Add secrets:')
  console.log('     - ANTHROPIC_API_KEY')
  console.log('     - OPENAI_API_KEY')
  
  console.log('\n4. Your functions will be available at:')
  FUNCTIONS.forEach(func => {
    console.log(`   https://${PROJECT_REF}.supabase.co/functions/v1/${func}`)
  })
  
  // Try to set global secrets at least
  console.log('\n🔑 Attempting to set global secrets...')
  await setFunctionSecrets('global')
}

deployAll().catch(console.error)