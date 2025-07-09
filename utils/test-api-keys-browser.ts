#!/usr/bin/env tsx
// Browser-based test for API keys endpoint
// This script simulates browser requests with proper cookie handling

import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const LOCAL_API_URL = 'http://localhost:3001'

async function testApiKeysWithBrowserAuth() {
  console.log('🔍 Testing API Keys Endpoint with Browser Authentication\n')

  console.log('This test requires you to:')
  console.log('1. Open http://localhost:3001 in your browser')
  console.log('2. Log in with your credentials')
  console.log('3. Open DevTools (F12)')
  console.log('4. Go to Network tab')
  console.log('5. Find any request to localhost:3001')
  console.log('6. Copy the Cookie header value')
  console.log('7. Paste it below when prompted\n')

  // For now, let's test without authentication to see what happens
  console.log('Testing without authentication first...\n')

  try {
    // Test 1: No authentication
    console.log('Test 1: GET /api/api-keys (no auth)')
    const response1 = await fetch(`${LOCAL_API_URL}/api/api-keys`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log(`Status: ${response1.status} ${response1.statusText}`)
    const data1 = await response1.json()
    console.log('Response:', JSON.stringify(data1, null, 2))

    // Test 2: Check if cookies are being read properly
    console.log('\nTest 2: Debugging cookie handling')
    
    // Create a debug endpoint to check cookie parsing
    console.log('\nTo manually test with your browser cookies:')
    console.log('1. Get your cookies from browser DevTools')
    console.log('2. Run this curl command:\n')
    
    console.log(`curl -X GET ${LOCAL_API_URL}/api/api-keys \\`)
    console.log(`  -H "Content-Type: application/json" \\`)
    console.log(`  -H "Cookie: YOUR_COOKIE_STRING_HERE"`)
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Alternative: Test with hardcoded session
async function testWithHardcodedSession() {
  console.log('\n\n📝 Alternative: Test with hardcoded session\n')
  
  // You can get these values from your browser's localStorage after logging in
  // Look for sb-*-auth-token in Application > Local Storage
  const EXAMPLE_ACCESS_TOKEN = 'your-access-token-here'
  const EXAMPLE_REFRESH_TOKEN = 'your-refresh-token-here'
  
  console.log('To get your tokens:')
  console.log('1. Log in at http://localhost:3001')
  console.log('2. Open DevTools > Application > Local Storage')
  console.log('3. Find the sb-*-auth-token key')
  console.log('4. Copy the access_token and refresh_token values')
  console.log('5. Update this script with those values\n')

  // Show how to construct the cookie
  const projectRef = 'bknpldydmkzupsfagnva' // from your Supabase URL
  const cookieName = `sb-${projectRef}-auth-token`
  
  console.log(`Cookie name should be: ${cookieName}`)
  console.log('\nExample cookie format:')
  console.log(`${cookieName}={"access_token":"...", "refresh_token":"...", ...}`)
}

// Run tests
async function main() {
  await testApiKeysWithBrowserAuth()
  await testWithHardcodedSession()
}

main().catch(console.error)