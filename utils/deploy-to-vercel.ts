#!/usr/bin/env node
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '3lGSE5odoBANVpzZYAPOPxOB'
const PROJECT_NAME = 'hawking-edison'

async function deployToVercel() {
  console.log('🚀 Deploying to Vercel...')
  
  try {
    // Set up environment variables for Vercel
    const envVars = [
      `NEXT_PUBLIC_SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL}`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
    ]
    
    // Create .vercel directory if it doesn't exist
    const vercelDir = path.join(process.cwd(), '.vercel')
    if (!fs.existsSync(vercelDir)) {
      fs.mkdirSync(vercelDir)
    }
    
    // Deploy using Vercel CLI
    const deployCommand = `VERCEL_TOKEN="${VERCEL_TOKEN}" npx vercel --yes --name ${PROJECT_NAME} ${envVars.map(v => `--env ${v}`).join(' ')}`
    
    console.log('Running deployment...')
    const output = execSync(deployCommand, { 
      encoding: 'utf8',
      stdio: 'inherit'
    })
    
    console.log('✅ Deployment successful!')
    
    // Get the deployment URL
    const urlCommand = `VERCEL_TOKEN="${VERCEL_TOKEN}" npx vercel ls --token ${VERCEL_TOKEN} | head -n 2 | tail -n 1 | awk '{print $2}'`
    const deploymentUrl = execSync(urlCommand, { encoding: 'utf8' }).trim()
    
    console.log(`\n🌍 Your app is live at: https://${deploymentUrl}`)
    console.log(`\n📊 Vercel Dashboard: https://vercel.com/dashboard`)
    
  } catch (error) {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  }
}

// Run deployment
deployToVercel()