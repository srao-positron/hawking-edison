#!/usr/bin/env npx tsx
// Test Edge Function deployment and AWS integration

import { config } from 'dotenv'
config({ path: '.env.local' })

const EDGE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_EDGE_FUNCTIONS_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function testEdgeFunction() {
  console.log('🔍 Testing Edge Function deployment...\n')
  
  // Test with a simple message that should trigger async processing
  const testInput = 'Hello, can you help me test the system?'
  
  try {
    console.log(`📡 Calling Edge Function at: ${EDGE_FUNCTIONS_URL}/functions/v1/interact`)
    console.log(`📝 Test input: "${testInput}"`)
    console.log(`🔐 Using auth token: ${ANON_KEY?.substring(0, 20)}...`)
    
    const response = await fetch(`${EDGE_FUNCTIONS_URL}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: testInput,
        mode: 'async'
      })
    })
    
    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`)
    
    const responseText = await response.text()
    console.log(`📄 Raw Response: ${responseText}`)
    
    try {
      const data = JSON.parse(responseText)
      console.log('\n✅ Parsed Response:', JSON.stringify(data, null, 2))
      
      if (data.success === false || data.error) {
        console.error('\n❌ Error in response:', data.error || data)
        
        // Check for specific error patterns
        if (data.error?.message?.includes('SNS')) {
          console.error('\n🚨 AWS SNS Issue Detected!')
          console.error('The Edge Function cannot publish to AWS SNS.')
          console.error('Possible causes:')
          console.error('1. AWS credentials not configured in Edge Function environment')
          console.error('2. SNS topic ARN not set')
          console.error('3. IAM permissions issue')
        }
        
        if (data.error?.message?.includes('orchestration session')) {
          console.error('\n🚨 Database Issue Detected!')
          console.error('Cannot create orchestration session in database.')
        }
      } else if (data.async && data.sessionId) {
        console.log('\n✅ Async processing initiated successfully!')
        console.log(`📋 Session ID: ${data.sessionId}`)
        console.log(`🔄 Status: ${data.status}`)
        
        // Test the SSE endpoint
        console.log('\n🔍 Testing SSE streaming endpoint...')
        const sseUrl = `${EDGE_FUNCTIONS_URL}/functions/v1/stream?sessionId=${data.sessionId}`
        console.log(`📡 SSE URL: ${sseUrl}`)
        
        // We can't easily test SSE in a script, but we can check if the endpoint exists
        const sseResponse = await fetch(sseUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ANON_KEY}`
          }
        })
        
        console.log(`📊 SSE Endpoint Status: ${sseResponse.status}`)
        if (sseResponse.status === 200) {
          console.log('✅ SSE endpoint is accessible')
        } else {
          console.error('❌ SSE endpoint returned error:', sseResponse.status)
        }
      } else {
        console.warn('\n⚠️  Unexpected response format')
      }
    } catch (parseError) {
      console.error('\n❌ Failed to parse response as JSON')
      console.error('Response might be HTML or plain text')
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error)
  }
  
  console.log('\n📋 Summary:')
  console.log('- Edge Function URL:', EDGE_FUNCTIONS_URL)
  console.log('- Auth configured:', !!ANON_KEY)
  console.log('\nIf you see "Failed to initiate processing" errors, check:')
  console.log('1. AWS credentials in Supabase Edge Function secrets')
  console.log('2. SNS topic ARN configuration')
  console.log('3. Lambda functions are deployed')
}

// Run the test
testEdgeFunction().catch(console.error)