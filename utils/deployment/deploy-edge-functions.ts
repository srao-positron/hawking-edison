#!/usr/bin/env tsx
// Deploy Edge Functions using Supabase Management API

import { config } from 'dotenv'
import { join } from 'path'
import { readFileSync, readdirSync } from 'fs'
import FormData from 'form-data'

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

async function deployFunction(functionName: string) {
  console.log(`\n📦 Deploying ${functionName}...`)
  
  try {
    const form = new FormData()
    
    // Add metadata
    const metadata = {
      entrypoint_path: 'index.ts',
      name: functionName,
      verify_jwt: true
    }
    form.append('metadata', JSON.stringify(metadata))
    
    // Add main function file
    const mainFile = readFileSync(
      join(process.cwd(), `supabase/functions/${functionName}/index.ts`),
      'utf-8'
    )
    form.append('file', mainFile, `index.ts`)
    
    // Add shared files
    for (const sharedFile of SHARED_FILES) {
      const content = readFileSync(
        join(process.cwd(), `supabase/functions/_shared/${sharedFile}`),
        'utf-8'
      )
      form.append('file', content, `_shared/${sharedFile}`)
    }
    
    // Add deno.json if it exists
    try {
      const denoConfig = readFileSync(
        join(process.cwd(), `supabase/functions/${functionName}/deno.json`),
        'utf-8'
      )
      form.append('file', denoConfig, 'deno.json')
    } catch {
      // deno.json is optional
    }
    
    // Deploy the function
    const response = await fetch(
      `${API_BASE}/projects/${PROJECT_REF}/functions/deploy?slug=${functionName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          ...form.getHeaders()
        },
        body: form
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
    }
    
  } catch (error: any) {
    console.error(`❌ Error deploying ${functionName}: ${error.message}`)
  }
}

async function setFunctionSecrets(functionName: string) {
  console.log(`   Setting environment variables for ${functionName}...`)
  
  const secrets = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
  }
  
  try {
    const response = await fetch(
      `${API_BASE}/projects/${PROJECT_REF}/functions/${functionName}/secrets`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(secrets)
      }
    )
    
    if (response.ok) {
      console.log(`   ✅ Environment variables set`)
    } else {
      console.error(`   ❌ Failed to set environment variables`)
      const text = await response.text()
      console.error(`      ${text}`)
    }
  } catch (error: any) {
    console.error(`   ❌ Error setting secrets: ${error.message}`)
  }
}

async function deployAll() {
  console.log('🚀 Deploying Edge Functions to Supabase...')
  console.log(`   Project: ${PROJECT_REF}`)
  console.log(`   Functions: ${FUNCTIONS.join(', ')}`)
  
  for (const func of FUNCTIONS) {
    await deployFunction(func)
  }
  
  console.log('\n✅ Deployment complete!')
  console.log('\nYour functions are available at:')
  FUNCTIONS.forEach(func => {
    console.log(`   https://${PROJECT_REF}.supabase.co/functions/v1/${func}`)
  })
}

// Check if form-data is installed
try {
  require('form-data')
} catch {
  console.error('❌ Missing dependency: form-data')
  console.log('Run: npm install --save-dev form-data')
  process.exit(1)
}

deployAll().catch(console.error)