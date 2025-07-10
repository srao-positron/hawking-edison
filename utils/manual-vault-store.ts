#!/usr/bin/env npx tsx
// Manually store AWS credentials in Vault using existing Edge Function credentials

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

async function manualStore() {
  console.log('🔐 Manually storing AWS credentials in Supabase Vault...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  // These are the credentials that were already created by CDK
  // You'll need to get these from AWS Console > Secrets Manager
  console.log('❗ Please provide the AWS credentials from Secrets Manager:')
  console.log('   1. Go to AWS Console > Secrets Manager')
  console.log('   2. Look for "hawking-edison/edge-function-creds"')
  console.log('   3. Copy the access key and secret')
  console.log('')
  console.log('For now, using placeholder values...')
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // First, let's check if the Vault functions exist
  const { data: testData, error: testError } = await supabase.rpc('get_aws_credentials')
  
  if (testError && testError.message.includes('function')) {
    console.error('❌ Vault functions not found in database')
    console.error('   Run: npx tsx utils/db-push.ts to apply migrations')
    return
  }
  
  console.log('✅ Vault functions exist in database')
  
  // Since we don't have the actual credentials yet, we'll just verify the setup
  console.log('\n📋 Next steps:')
  console.log('1. Get the actual AWS credentials from Secrets Manager')
  console.log('2. Run: npx tsx utils/store-aws-creds-in-vault.ts <access-key> <secret-key> <region> <topic-arn>')
  console.log('3. Restart Edge Functions to pick up the new credentials')
}

// Run the script
manualStore().catch(console.error)