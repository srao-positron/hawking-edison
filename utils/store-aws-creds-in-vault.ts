#!/usr/bin/env npx tsx
// Store AWS credentials in Supabase Vault
// This script can be run after CDK deployment to store the credentials

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function storeCredentials() {
  const args = process.argv.slice(2)
  
  if (args.length < 4) {
    console.error('Usage: npx tsx store-aws-creds-in-vault.ts <accessKeyId> <secretAccessKey> <region> <topicArn>')
    console.error('')
    console.error('Example:')
    console.error('npx tsx store-aws-creds-in-vault.ts AKIAIOSFODNN7EXAMPLE wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY us-east-1 arn:aws:sns:us-east-1:123456789012:topic-name')
    process.exit(1)
  }

  const [accessKeyId, secretAccessKey, region, topicArn] = args

  console.log('🔐 Storing AWS credentials in Supabase Vault...\n')
  
  // Create Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  try {
    // Call the stored procedure to save credentials
    const { error } = await supabase.rpc('store_aws_credentials', {
      p_access_key_id: accessKeyId,
      p_secret_access_key: secretAccessKey,
      p_region: region,
      p_topic_arn: topicArn
    })
    
    if (error) {
      console.error('❌ Failed to store credentials:', error)
      process.exit(1)
    }
    
    console.log('✅ AWS credentials stored successfully in Vault!')
    console.log('')
    console.log('Edge Functions will now automatically use these credentials.')
    console.log('No need to manually update Edge Function secrets.')
    
    // Verify the credentials can be retrieved
    console.log('\n🔍 Verifying credentials can be retrieved...')
    const { data: retrievedCreds, error: retrieveError } = await supabase.rpc('get_aws_credentials')
    
    if (retrieveError) {
      console.error('❌ Failed to retrieve credentials:', retrieveError)
    } else if (retrievedCreds) {
      console.log('✅ Credentials verified!')
      console.log(`   Access Key ID: ${retrievedCreds.accessKeyId.substring(0, 10)}...`)
      console.log(`   Region: ${retrievedCreds.region}`)
      console.log(`   Topic ARN: ${retrievedCreds.topicArn}`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run the script
storeCredentials().catch(console.error)