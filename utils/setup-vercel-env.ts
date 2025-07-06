#!/usr/bin/env node
import { execSync } from 'child_process'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const VERCEL_TOKEN = '3lGSE5odoBANVpzZYAPOPxOB'
const TEAM_ID = 'team_ZEuYsR2MIugF2AV3vr4TR43L'

async function setupVercelEnv() {
  console.log('🔧 Setting up Vercel environment variables...')
  
  const envVars = [
    {
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      value: process.env.NEXT_PUBLIC_SUPABASE_URL,
      type: 'plain'
    },
    {
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      type: 'plain'
    }
  ]
  
  for (const { key, value, type } of envVars) {
    if (!value) {
      console.error(`❌ Missing value for ${key}`)
      continue
    }
    
    try {
      // Add environment variable using Vercel CLI
      const cmd = `VERCEL_TOKEN="${VERCEL_TOKEN}" VERCEL_SCOPE="${TEAM_ID}" npx vercel env add ${key} production --force`
      
      console.log(`Adding ${key}...`)
      
      // Use echo to pipe the value to the command
      execSync(`echo "${value}" | ${cmd}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'inherit', 'inherit']
      })
      
      console.log(`✅ Added ${key}`)
    } catch (error) {
      console.error(`❌ Failed to add ${key}:`, error)
    }
  }
  
  console.log('\n✅ Environment variables set up!')
}

// Run setup
setupVercelEnv()