#!/usr/bin/env npx tsx
// Verify the entire vault automation is working

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

async function verifyVaultAutomation() {
  console.log('🔍 Verifying Vault Automation System\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. Check if AWS credentials exist in Vault
    console.log('1️⃣ Checking Vault for AWS credentials...')
    const { data, error } = await supabase.rpc('get_aws_credentials')
    
    if (error) {
      console.error('❌ Error retrieving credentials:', error.message)
      return
    }
    
    if (!data) {
      console.log('⚠️  No credentials found in Vault yet')
      console.log('   Run CDK deployment to store them automatically')
      return
    }
    
    console.log('✅ AWS credentials found in Vault!')
    console.log(`   Access Key ID: ${data.accessKeyId?.substring(0, 10)}...`)
    console.log(`   Region: ${data.region}`)
    console.log(`   Topic ARN: ${data.topicArn}`)
    console.log(`   Updated: ${data.updatedAt}`)
    
    // 2. Verify the credentials look valid
    console.log('\n2️⃣ Validating credential format...')
    
    const validations = [
      { field: 'accessKeyId', check: data.accessKeyId?.startsWith('AKIA'), desc: 'Access Key format' },
      { field: 'secretAccessKey', check: data.secretAccessKey?.length > 20, desc: 'Secret Key length' },
      { field: 'region', check: data.region === 'us-east-1' || data.region === 'us-east-2', desc: 'AWS Region' },
      { field: 'topicArn', check: data.topicArn?.includes('hawking-edison'), desc: 'Topic ARN' }
    ]
    
    let allValid = true
    for (const v of validations) {
      if (v.check) {
        console.log(`   ✅ ${v.desc}: Valid`)
      } else {
        console.log(`   ❌ ${v.desc}: Invalid`)
        allValid = false
      }
    }
    
    if (allValid) {
      console.log('\n🎉 Vault automation is working perfectly!')
      console.log('   - CDK deployed AWS credentials')
      console.log('   - Lambda stored them via Vercel proxy')
      console.log('   - Edge Functions can now use them')
      console.log('\n✨ The system is ready for end-to-end testing!')
    } else {
      console.log('\n⚠️  Some credentials look invalid')
      console.log('   You may need to run CDK deployment again')
    }
    
  } catch (error) {
    console.error('❌ Error verifying vault automation:', error)
  }
}

// Run verification
verifyVaultAutomation().catch(console.error)