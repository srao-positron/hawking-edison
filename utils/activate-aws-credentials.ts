#!/usr/bin/env tsx

/**
 * Activate AWS credentials in the database
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function activateAwsCredentials() {
  console.log('🔧 Activating AWS credentials...\n')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Update all credentials to be active
    const { data, error } = await supabase
      .from('aws_credentials')
      .update({ is_active: true })
      .select()
    
    if (error) {
      console.error('❌ Error updating credentials:', error.message)
      return
    }
    
    console.log(`✅ Activated ${data.length} credential entries`)
    
    // Test the RPC function again
    console.log('\n🔧 Testing get_aws_credentials RPC function...')
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_aws_credentials')
    
    if (rpcError) {
      console.error('❌ RPC function error:', rpcError.message)
    } else if (!rpcData) {
      console.log('⚠️  RPC function returned no data')
    } else {
      console.log('✅ RPC function working correctly')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the activation
activateAwsCredentials()