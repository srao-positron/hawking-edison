#!/usr/bin/env npx tsx
// Retrieve AWS credentials from Secrets Manager and store in Vault
// This is a temporary workaround until the CDK deployment completes

import { config } from 'dotenv'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { execSync } from 'child_process'

config({ path: '.env.local' })

async function retrieveAndStore() {
  console.log('🔍 Retrieving AWS credentials from Secrets Manager...\n')
  
  const secretsManager = new SecretsManagerClient({ 
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
  })
  
  try {
    // Retrieve the secret
    const command = new GetSecretValueCommand({
      SecretId: 'hawking-edison/edge-function-creds'
    })
    
    const response = await secretsManager.send(command)
    const secretData = JSON.parse(response.SecretString || '{}')
    
    console.log('✅ Retrieved credentials from AWS Secrets Manager')
    console.log(`   Access Key ID: ${secretData.accessKeyId?.substring(0, 10)}...`)
    console.log(`   Region: ${secretData.region}`)
    console.log(`   Topic ARN: ${secretData.topicArn}`)
    
    // Store in Vault using our utility
    console.log('\n🔐 Storing credentials in Supabase Vault...')
    
    const storeCommand = `npx tsx utils/store-aws-creds-in-vault.ts "${secretData.accessKeyId}" "${secretData.secretAccessKey}" "${secretData.region}" "${secretData.topicArn}"`
    
    execSync(storeCommand, { stdio: 'inherit' })
    
    console.log('\n✅ Complete! Edge Functions can now use these credentials.')
    
  } catch (error) {
    console.error('❌ Error:', error)
    console.error('\nMake sure you have AWS credentials configured in your environment.')
    process.exit(1)
  }
}

// Run the script
retrieveAndStore().catch(console.error)