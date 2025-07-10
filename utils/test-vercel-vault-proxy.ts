#!/usr/bin/env npx tsx
// Test the Vercel vault-store proxy

import { config } from 'dotenv'

config({ path: '.env.local' })

async function testVercelProxy() {
  console.log('🧪 Testing Vercel vault-store proxy...\n')
  
  const vercelUrl = 'https://hawking-edison.vercel.app'
  const serviceKey = process.env.VAULT_STORE_SERVICE_KEY!
  
  const proxyUrl = `${vercelUrl}/api/vault-store`
  
  console.log(`📍 Proxy URL: ${proxyUrl}`)
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
    const response = await fetch(proxyUrl, {
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
      console.log('\n✅ Vercel proxy is working!')
      console.log('   Success:', result.success)
      console.log('   Message:', result.message)
      console.log('   Verified:', result.verified)
      console.log('\n🎉 CDK deployment should now work!')
    } else {
      console.log('\n❌ Vercel proxy returned an error')
      try {
        const error = JSON.parse(responseText)
        console.log('   Error:', error.error)
      } catch {
        console.log('   Raw response:', responseText)
      }
    }
    
  } catch (error) {
    console.error('\n❌ Failed to call Vercel proxy:', error)
    console.error('\nPossible issues:')
    console.error('1. Vercel deployment not complete')
    console.error('2. Network connectivity issues')
    console.error('3. Invalid service key')
  }
}

// Run the test
testVercelProxy().catch(console.error)