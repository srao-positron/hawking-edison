#!/usr/bin/env tsx

// Test API keys endpoint in production

async function testApiKeys() {
  console.log('Testing API keys endpoint in production...\n')
  
  const url = 'https://hawkingedison.com/api/api-keys'
  
  try {
    // Test without credentials
    console.log('1. Testing without credentials:')
    const response1 = await fetch(url)
    console.log(`   Status: ${response1.status}`)
    const data1 = await response1.json()
    console.log(`   Response:`, JSON.stringify(data1, null, 2))
    
    // Test with credentials
    console.log('\n2. Testing with credentials (include cookies):')
    const response2 = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    console.log(`   Status: ${response2.status}`)
    const data2 = await response2.json()
    console.log(`   Response:`, JSON.stringify(data2, null, 2))
    
    // Check the Edge Function URL
    console.log('\n3. Checking Edge Function URL:')
    console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testApiKeys()