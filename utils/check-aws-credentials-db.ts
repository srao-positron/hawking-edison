#!/usr/bin/env tsx

/**
 * Check AWS credentials stored in Supabase database
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkAwsCredentials() {
  console.log('🔍 Checking AWS credentials in database...\n')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Check aws_credentials table
    console.log('📊 Querying aws_credentials table...')
    const { data: credentials, error } = await supabase
      .from('aws_credentials')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error querying aws_credentials:', error.message)
      return
    }
    
    if (!credentials || credentials.length === 0) {
      console.log('⚠️  No AWS credentials found in database')
      console.log('   The CDK deployment should have stored credentials')
      console.log('   Check if the vault-store endpoint was called during deployment')
    } else {
      console.log(`✅ Found ${credentials.length} credential entries:\n`)
      
      credentials.forEach((cred, index) => {
        console.log(`Entry ${index + 1}:`)
        console.log(`  ID: ${cred.id}`)
        console.log(`  Service: ${cred.service}`)
        console.log(`  Access Key ID: ${cred.access_key_id}`)
        console.log(`  Secret Key: ${cred.secret_access_key ? '***hidden***' : 'missing'}`)
        console.log(`  Region: ${cred.region}`)
        console.log(`  Topic ARN: ${cred.topic_arn}`)
        console.log(`  Created: ${new Date(cred.created_at).toLocaleString()}`)
        console.log(`  Status: ${cred.is_active ? 'Active' : 'Inactive'}`)
        console.log()
      })
      
      // Check for active credentials
      const activeCredentials = credentials.filter(c => c.is_active)
      if (activeCredentials.length === 0) {
        console.log('⚠️  No active credentials found!')
      } else {
        console.log(`✅ ${activeCredentials.length} active credential(s) available`)
      }
    }
    
    // Check the RPC function
    console.log('\n🔧 Testing get_aws_credentials RPC function...')
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_aws_credentials')
    
    if (rpcError) {
      console.error('❌ RPC function error:', rpcError.message)
    } else if (!rpcData) {
      console.log('⚠️  RPC function returned no data')
    } else {
      console.log('✅ RPC function returned credentials:')
      console.log(`   Access Key ID: ${rpcData.accessKeyId}`)
      console.log(`   Secret Key: ${rpcData.secretAccessKey ? '***hidden***' : 'missing'}`)
      console.log(`   Region: ${rpcData.region}`)
      console.log(`   Topic ARN: ${rpcData.topicArn}`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the check
checkAwsCredentials()