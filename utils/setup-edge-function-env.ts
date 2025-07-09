#!/usr/bin/env npx tsx
// Script to set up Edge Function environment variables for AWS SNS access

import { execSync } from 'child_process'
import * as readline from 'readline/promises'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function main() {
  console.log('Setting up Edge Function environment variables for AWS SNS...\n')
  
  console.log('You will need the following from your AWS deployment:')
  console.log('1. AWS Access Key ID')
  console.log('2. AWS Secret Access Key')
  console.log('3. AWS Region (default: us-east-1)')
  console.log('4. SNS Topic ARN\n')
  
  const accessKeyId = await rl.question('AWS Access Key ID: ')
  const secretAccessKey = await rl.question('AWS Secret Access Key: ')
  const region = await rl.question('AWS Region (press enter for us-east-1): ') || 'us-east-1'
  const topicArn = await rl.question('SNS Topic ARN: ')
  
  console.log('\nSetting environment variables...')
  
  try {
    // Set Edge Function secrets
    const secrets = [
      { key: 'AWS_ACCESS_KEY_ID', value: accessKeyId },
      { key: 'AWS_SECRET_ACCESS_KEY', value: secretAccessKey },
      { key: 'AWS_REGION', value: region },
      { key: 'AWS_SNS_TOPIC_ARN', value: topicArn }
    ]
    
    for (const secret of secrets) {
      console.log(`Setting ${secret.key}...`)
      execSync(
        `npx supabase secrets set ${secret.key}="${secret.value}" --project-ref bknpldydmkzupsfagnva`,
        { stdio: 'inherit' }
      )
    }
    
    console.log('\n✅ Environment variables set successfully!')
    console.log('\nTo deploy the updated Edge Functions with these secrets, run:')
    console.log('npm run deploy:edge-functions')
    
  } catch (error) {
    console.error('\n❌ Error setting environment variables:', error)
    process.exit(1)
  } finally {
    rl.close()
  }
}

main().catch(console.error)