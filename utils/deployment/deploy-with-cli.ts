#!/usr/bin/env tsx
// Deploy Edge Functions using Supabase CLI without Docker

import { config } from 'dotenv'
import { join } from 'path'
import { execSync } from 'child_process'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })

const PROJECT_ID = 'bknpldydmkzupsfagnva'
const FUNCTIONS = ['interact', 'databank', 'memories', 'auth-api-keys', 'chat-threads', 'vault-store']

// Check requirements
function checkRequirements() {
  console.log('🔍 Checking requirements...\n')
  
  // Check for Supabase access token
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.error('❌ SUPABASE_ACCESS_TOKEN not found')
    console.log('\nTo get your access token:')
    console.log('1. Go to https://supabase.com/dashboard/account/tokens')
    console.log('2. Create a new token')
    console.log('3. Add to .env.local as SUPABASE_ACCESS_TOKEN=your-token\n')
    process.exit(1)
  }
  
  // Check for API keys
  if (!process.env.ANTHROPIC_API_KEY || !process.env.OPENAI_API_KEY) {
    console.warn('⚠️  Missing API keys - functions will deploy but may not work properly')
  }
  
  // Check if Supabase CLI is installed
  try {
    execSync('npx supabase --version', { stdio: 'ignore' })
    console.log('✅ Supabase CLI is available')
  } catch {
    console.error('❌ Supabase CLI not found')
    console.log('Installing via npm...')
    execSync('npm install --save-dev supabase@latest', { stdio: 'inherit' })
  }
}

// Link to project
function linkProject() {
  console.log('\n🔗 Linking to Supabase project...')
  try {
    execSync(`npx supabase link --project-ref ${PROJECT_ID}`, { 
      stdio: 'inherit',
      env: { ...process.env }
    })
    console.log('✅ Project linked')
  } catch (error) {
    console.error('❌ Failed to link project')
    throw error
  }
}

// Deploy a single function
function deployFunction(functionName: string) {
  console.log(`\n📦 Deploying ${functionName}...`)
  try {
    // Use the beta version with --use-api flag to avoid Docker requirement
    // Deploy vault-store without JWT verification since it's an internal service
    const noVerifyJwt = functionName === 'vault-store' ? '--no-verify-jwt' : ''
    const command = `npx supabase@beta functions deploy ${functionName} --project-ref ${PROJECT_ID} --use-api ${noVerifyJwt}`
    
    execSync(command, { 
      stdio: 'inherit',
      env: { ...process.env }
    })
    
    console.log(`✅ ${functionName} deployed successfully`)
    return true
  } catch (error) {
    console.error(`❌ Failed to deploy ${functionName}`)
    return false
  }
}

// Set secrets
function setSecrets() {
  console.log('\n🔑 Setting function secrets...')
  
  // Create temporary env file
  const envContent = `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY}
OPENAI_API_KEY=${process.env.OPENAI_API_KEY}
VAULT_STORE_SERVICE_KEY=${process.env.VAULT_STORE_SERVICE_KEY}`
  
  require('fs').writeFileSync('.env.functions', envContent)
  
  try {
    execSync(`npx supabase secrets set --env-file .env.functions --project-ref ${PROJECT_ID}`, {
      stdio: 'inherit',
      env: { ...process.env }
    })
    console.log('✅ Secrets set successfully')
  } catch (error) {
    console.error('⚠️  Failed to set some secrets (they may already exist)')
  } finally {
    // Clean up
    require('fs').unlinkSync('.env.functions')
  }
}

// Test deployment
function testDeployment() {
  console.log('\n🧪 Testing deployed functions...')
  try {
    execSync('npm run deploy:check', { stdio: 'inherit' })
  } catch {
    console.warn('⚠️  Some functions may not be responding yet')
  }
}

// Main deployment function
async function deploy() {
  console.log('🚀 Deploying Edge Functions using Supabase CLI (no Docker required)\n')
  
  checkRequirements()
  linkProject()
  
  // Deploy all functions
  let successCount = 0
  for (const func of FUNCTIONS) {
    if (deployFunction(func)) {
      successCount++
    }
  }
  
  console.log(`\n📊 Deployed ${successCount}/${FUNCTIONS.length} functions`)
  
  if (successCount > 0) {
    setSecrets()
    
    console.log('\n✅ Deployment complete!')
    console.log('\nYour functions are available at:')
    FUNCTIONS.forEach(func => {
      console.log(`  https://${PROJECT_ID}.supabase.co/functions/v1/${func}`)
    })
    
    console.log('\n💡 Run `npm run deploy:check` to verify endpoints')
  } else {
    console.error('\n❌ No functions were deployed successfully')
    process.exit(1)
  }
}

// Handle specific function deployment
const specificFunction = process.argv[2]
if (specificFunction) {
  if (FUNCTIONS.includes(specificFunction)) {
    console.log(`Deploying only: ${specificFunction}`)
    checkRequirements()
    linkProject()
    deployFunction(specificFunction)
    setSecrets()
  } else {
    console.error(`Unknown function: ${specificFunction}`)
    console.log(`Available functions: ${FUNCTIONS.join(', ')}`)
    process.exit(1)
  }
} else {
  deploy().catch(console.error)
}