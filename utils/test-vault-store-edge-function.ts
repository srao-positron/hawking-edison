#!/usr/bin/env npx tsx
// Test the vault-store Edge Function

import { config } from 'dotenv'

config({ path: '.env.local' })

async function testVaultStore() {
  console.log('🧪 Testing vault-store Edge Function...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.VAULT_STORE_SERVICE_KEY!
  
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/vault-store`
  
  console.log(`📍 Edge Function URL: ${edgeFunctionUrl}`)
  console.log(`🔑 Service Key: ${serviceKey.substring(0, 10)}...`)
  console.log('')
  
  // Test data
  const testData = {
    accessKeyId: 'AKIATEST123456789012',
    secretAccessKey: 'testSecretKey123456789012345678901234567',
    region: 'us-east-1',
    topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic'
  }
  
  try {
    console.log('📤 Sending test request...')
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': serviceKey,
      },
      body: JSON.stringify(testData),
    })
    
    console.log(`📥 Response Status: ${response.status} ${response.statusText}`)
    
    const responseText = await response.text()
    console.log(`📄 Response Body: ${responseText}`)
    
    if (response.ok) {
      const result = JSON.parse(responseText)
      console.log('\n✅ Edge Function is working!')
      console.log('   Success:', result.success)
      console.log('   Message:', result.message)
      console.log('   Verified:', result.verified)
    } else {
      console.log('\n❌ Edge Function returned an error')
      try {
        const error = JSON.parse(responseText)
        console.log('   Error:', error.error)
      } catch {
        console.log('   Raw response:', responseText)
      }
    }
    
  } catch (error) {
    console.error('\n❌ Failed to call Edge Function:', error)
    console.error('\nPossible issues:')
    console.error('1. Edge Function not deployed')
    console.error('2. Network connectivity issues')
    console.error('3. Invalid URL or credentials')
  }
}

// Run the test
testVaultStore().catch(console.error)