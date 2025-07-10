#!/usr/bin/env npx tsx
// Quick script to store AWS credentials in Vault
// Usage: npx tsx utils/quick-store-aws-creds.ts

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

async function quickStore() {
  console.log('🔐 AWS Credential Storage Helper\n')
  
  // Check command line arguments
  const args = process.argv.slice(2)
  if (args.length !== 4) {
    console.log('Usage: npx tsx utils/quick-store-aws-creds.ts <access-key-id> <secret-access-key> <region> <topic-arn>')
    console.log('\nExample:')
    console.log('  npx tsx utils/quick-store-aws-creds.ts AKIA... mysecret... us-east-1 arn:aws:sns:us-east-1:...')
    console.log('\nTo get these values:')
    console.log('  1. Go to AWS Console > Secrets Manager')
    console.log('  2. Find "hawking-edison/edge-function-creds"')
    console.log('  3. View the secret values')
    console.log('\nOr check CloudFormation outputs:')
    console.log('  1. Go to AWS Console > CloudFormation')
    console.log('  2. Find "hawking-edison-dev" stack')
    console.log('  3. Check the Outputs tab')
    return
  }
  
  const [accessKeyId, secretAccessKey, region, topicArn] = args
  
  console.log('📋 Credentials to store:')
  console.log(`   Access Key ID: ${accessKeyId.substring(0, 10)}...`)
  console.log(`   Region: ${region}`)
  console.log(`   Topic ARN: ${topicArn}`)
  console.log('')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // Store credentials in Vault
  console.log('🚀 Storing credentials in Vault...')
  
  const { error } = await supabase.rpc('store_aws_credentials', {
    p_access_key_id: accessKeyId,
    p_secret_access_key: secretAccessKey,
    p_region: region,
    p_topic_arn: topicArn
  })
  
  if (error) {
    console.error('❌ Failed to store credentials:', error.message)
    return
  }
  
  console.log('✅ Credentials stored successfully!')
  
  // Verify storage
  console.log('\n🔍 Verifying storage...')
  const { data, error: verifyError } = await supabase.rpc('get_aws_credentials')
  
  if (verifyError) {
    console.error('❌ Failed to verify:', verifyError.message)
    return
  }
  
  if (data) {
    console.log('✅ Verification successful!')
    console.log(`   Stored Access Key: ${data.accessKeyId?.substring(0, 10)}...`)
    console.log(`   Stored Region: ${data.region}`)
    console.log(`   Updated At: ${data.updatedAt}`)
  }
  
  console.log('\n🎉 Done! Edge Functions can now use AWS services.')
  console.log('   The Edge Functions will automatically retrieve these credentials from Vault.')
}

// Run the script
quickStore().catch(console.error)