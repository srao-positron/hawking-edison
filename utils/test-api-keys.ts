#!/usr/bin/env node

// API Key Testing Helper Script
// Usage: npm run test:api-keys

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import { generateApiKey } from '../src/lib/api-key-utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function testApiKeyAuth() {
  log('\n🔐 Testing API Key Authentication\n', 'blue')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Create test user
  log('Creating test user...', 'yellow')
  const testEmail = `api-test-${Date.now()}@example.com`
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: 'test-password-123',
    email_confirm: true,
  })

  if (authError) {
    log(`Failed to create test user: ${authError.message}`, 'red')
    return
  }

  const userId = authData.user.id
  log(`✓ Created test user: ${testEmail}`, 'green')

  try {
    // Generate and store API key
    log('\nGenerating API key...', 'yellow')
    const { key, hash, prefix } = generateApiKey('test')
    
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name: 'Test API Key',
        key_hash: hash,
        key_prefix: prefix,
      })
      .select()
      .single()

    if (keyError) {
      log(`Failed to create API key: ${keyError.message}`, 'red')
      return
    }

    log(`✓ Generated API key: ${key}`, 'green')
    log(`  Prefix: ${prefix}`, 'blue')
    log(`  Hash: ${hash.substring(0, 16)}...`, 'blue')

    // Test 1: Authorization header
    log('\n1. Testing Authorization header...', 'yellow')
    const authHeaderResponse = await fetch(`${SUPABASE_URL}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        input: 'Hello from API key test',
      }),
    })

    if (authHeaderResponse.ok) {
      log('✓ Authorization header authentication successful', 'green')
      const data = await authHeaderResponse.json()
      log(`  Response: ${JSON.stringify(data).substring(0, 100)}...`, 'blue')
    } else {
      log(`✗ Authorization header failed: ${authHeaderResponse.status}`, 'red')
      const error = await authHeaderResponse.text()
      log(`  Error: ${error}`, 'red')
    }

    // Test 2: X-API-Key header
    log('\n2. Testing X-API-Key header...', 'yellow')
    const apiKeyHeaderResponse = await fetch(`${SUPABASE_URL}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': key,
      },
      body: JSON.stringify({
        input: 'Hello from X-API-Key test',
      }),
    })

    if (apiKeyHeaderResponse.ok) {
      log('✓ X-API-Key header authentication successful', 'green')
    } else {
      log(`✗ X-API-Key header failed: ${apiKeyHeaderResponse.status}`, 'red')
    }

    // Test 3: Query parameter
    log('\n3. Testing query parameter...', 'yellow')
    const queryParamResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/interact?api_key=${key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: 'Hello from query param test',
        }),
      }
    )

    if (queryParamResponse.ok) {
      log('✓ Query parameter authentication successful', 'green')
    } else {
      log(`✗ Query parameter failed: ${queryParamResponse.status}`, 'red')
    }

    // Test 4: Invalid key
    log('\n4. Testing invalid API key...', 'yellow')
    const invalidKeyResponse = await fetch(`${SUPABASE_URL}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer hke_test_invalid123',
      },
      body: JSON.stringify({
        input: 'This should fail',
      }),
    })

    if (invalidKeyResponse.status === 401) {
      log('✓ Invalid key correctly rejected', 'green')
    } else {
      log(`✗ Invalid key not rejected: ${invalidKeyResponse.status}`, 'red')
    }

    // Test 5: Revoked key
    log('\n5. Testing revoked API key...', 'yellow')
    await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', apiKeyData.id)

    const revokedKeyResponse = await fetch(`${SUPABASE_URL}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        input: 'This should fail with revoked key',
      }),
    })

    if (revokedKeyResponse.status === 401) {
      log('✓ Revoked key correctly rejected', 'green')
    } else {
      log(`✗ Revoked key not rejected: ${revokedKeyResponse.status}`, 'red')
    }

    // Test 6: API key management endpoints
    log('\n6. Testing API key management endpoints...', 'yellow')
    
    // Un-revoke the key for management tests
    await supabase
      .from('api_keys')
      .update({ revoked_at: null })
      .eq('id', apiKeyData.id)

    // List keys
    const listResponse = await fetch(`${API_BASE_URL}/api/keys`, {
      headers: {
        'Authorization': `Bearer ${key}`,
      },
    })

    if (listResponse.ok) {
      log('✓ List API keys successful', 'green')
      const listData = await listResponse.json()
      log(`  Found ${listData.data.keys.length} key(s)`, 'blue')
    } else {
      log(`✗ List API keys failed: ${listResponse.status}`, 'red')
    }

    // Create new key
    const createResponse = await fetch(`${API_BASE_URL}/api/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        name: 'Test Created Key',
        expiresInDays: 7,
        environment: 'test',
      }),
    })

    let createdKeyId: string | undefined
    if (createResponse.ok) {
      log('✓ Create API key successful', 'green')
      const createData = await createResponse.json()
      createdKeyId = createData.data.id
      log(`  New key: ${createData.data.key.substring(0, 20)}...`, 'blue')
    } else {
      log(`✗ Create API key failed: ${createResponse.status}`, 'red')
    }

    // Clean up created key
    if (createdKeyId) {
      await supabase
        .from('api_keys')
        .delete()
        .eq('id', createdKeyId)
    }

    // Test 7: Check last_used_at update
    log('\n7. Testing last_used_at update...', 'yellow')
    const { data: beforeUse } = await supabase
      .from('api_keys')
      .select('last_used_at')
      .eq('id', apiKeyData.id)
      .single()

    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second

    await fetch(`${SUPABASE_URL}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        input: 'Update last_used_at test',
      }),
    })

    const { data: afterUse } = await supabase
      .from('api_keys')
      .select('last_used_at')
      .eq('id', apiKeyData.id)
      .single()

    if (afterUse && afterUse.last_used_at !== beforeUse?.last_used_at) {
      log('✓ last_used_at correctly updated', 'green')
      log(`  Before: ${beforeUse?.last_used_at || 'null'}`, 'blue')
      log(`  After: ${afterUse.last_used_at}`, 'blue')
    } else {
      log('✗ last_used_at not updated', 'red')
    }

  } finally {
    // Clean up
    log('\nCleaning up...', 'yellow')
    
    // Delete all API keys for test user
    await supabase
      .from('api_keys')
      .delete()
      .eq('user_id', userId)

    // Delete test user
    await supabase.auth.admin.deleteUser(userId)
    
    log('✓ Cleanup complete', 'green')
  }

  log('\n🎉 API Key testing complete!\n', 'blue')
}

// Run tests
testApiKeyAuth().catch(error => {
  log(`\n❌ Test failed: ${error.message}`, 'red')
  process.exit(1)
})