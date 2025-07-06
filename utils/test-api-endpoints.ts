#!/usr/bin/env tsx
// Test API endpoints directly

import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })

const BASE_URL = 'https://bknpldydmkzupsfagnva.supabase.co/functions/v1'

async function testEndpoints() {
  console.log('🧪 Testing Edge Function endpoints...\n')
  
  // Get a test token (you'll need to be logged in)
  console.log('⚠️  Note: These tests require deployed Edge Functions.')
  console.log('If functions are not deployed, all tests will fail.\n')
  
  const endpoints = [
    { name: 'Interact', url: `${BASE_URL}/interact`, method: 'POST' },
    { name: 'Databank List', url: `${BASE_URL}/databank/list`, method: 'GET' },
    { name: 'Memories Streams', url: `${BASE_URL}/memories/streams`, method: 'GET' },
    { name: 'Auth API Keys', url: `${BASE_URL}/auth-api-keys`, method: 'GET' }
  ]
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint.name}...`)
    
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          // Without auth, we expect 401
        },
        ...(endpoint.method === 'POST' && {
          body: JSON.stringify({ input: 'test' })
        })
      })
      
      if (response.status === 404) {
        console.log(`❌ ${endpoint.name}: Not deployed (404)`)
      } else if (response.status === 401) {
        console.log(`✅ ${endpoint.name}: Endpoint exists, requires auth (401)`)
      } else {
        console.log(`⚠️  ${endpoint.name}: Unexpected status ${response.status}`)
      }
      
      // Try to read response
      const text = await response.text()
      if (text) {
        try {
          const json = JSON.parse(text)
          console.log(`   Response structure: ${Object.keys(json).join(', ')}`)
        } catch {
          console.log(`   Response: ${text.substring(0, 100)}...`)
        }
      }
    } catch (error: any) {
      console.log(`❌ ${endpoint.name}: ${error.message}`)
    }
    
    console.log('')
  }
  
  console.log('=' + '='.repeat(60))
  console.log('\nIf all endpoints return 404, Edge Functions need to be deployed.')
  console.log('If they return 401, the endpoints exist and are working correctly.\n')
}

testEndpoints().catch(console.error)