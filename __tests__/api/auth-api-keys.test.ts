import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { generateApiKey, hashApiKey } from '@/lib/api-key-utils'

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Test user credentials
const TEST_EMAIL = `sid+he-testing-jest-${Date.now()}@hawkingedison.com`
const TEST_PASSWORD = 'test-password-123'

describe('API Key Authentication', () => {
  let supabase: any
  let serviceSupabase: any
  let userId: string
  let apiKey: string
  let apiKeyId: string

  beforeAll(async () => {
    // Initialize clients
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Create test user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    if (signUpError) {
      console.error('Failed to create test user:', signUpError)
      throw signUpError
    }

    userId = authData.user!.id

    // Create an API key for testing
    const generated = generateApiKey('test')
    apiKey = generated.key
    
    const { data: keyData, error: keyError } = await serviceSupabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name: 'Test API Key',
        key_hash: generated.hash,
        key_prefix: generated.prefix,
      })
      .select()
      .single()

    if (keyError) {
      console.error('Failed to create API key:', keyError)
      throw keyError
    }

    apiKeyId = keyData.id
  })

  afterAll(async () => {
    // Clean up API keys
    if (serviceSupabase && userId) {
      await serviceSupabase
        .from('api_keys')
        .delete()
        .eq('user_id', userId)
    }

    // Clean up test user
    if (serviceSupabase && userId) {
      await serviceSupabase.auth.admin.deleteUser(userId)
    }
  })

  describe('API Key Format', () => {
    test('should generate valid API key format', () => {
      const { key, hash, prefix } = generateApiKey('live')
      
      expect(key).toMatch(/^hke_live_[A-Za-z0-9_-]{43,}$/)
      expect(hash).toHaveLength(64) // SHA-256 hex string
      expect(prefix).toHaveLength(12)
      expect(key.startsWith(prefix)).toBe(true)
    })

    test('should generate different keys for different environments', () => {
      const liveKey = generateApiKey('live')
      const testKey = generateApiKey('test')
      
      expect(liveKey.key).toMatch(/^hke_live_/)
      expect(testKey.key).toMatch(/^hke_test_/)
      expect(liveKey.key).not.toBe(testKey.key)
    })

    test('should hash API keys consistently', () => {
      const key = 'hke_test_example123'
      const hash1 = hashApiKey(key)
      const hash2 = hashApiKey(key)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64)
    })
  })

  describe('Edge Function Authentication', () => {
    test('should authenticate with API key in Authorization header', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: 'Test request with API key',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    test('should authenticate with API key in X-API-Key header', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          input: 'Test request with X-API-Key',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    test('should authenticate with API key in query parameter', async () => {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/interact?api_key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: 'Test request with query param',
          }),
        }
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    test('should reject invalid API key', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer hke_test_invalid123',
        },
        body: JSON.stringify({
          input: 'Test request with invalid key',
        }),
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('AUTH_INVALID')
    })

    test('should reject revoked API key', async () => {
      // Revoke the key
      await serviceSupabase
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', apiKeyId)

      const response = await fetch(`${SUPABASE_URL}/functions/v1/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: 'Test request with revoked key',
        }),
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('AUTH_INVALID')

      // Un-revoke for other tests
      await serviceSupabase
        .from('api_keys')
        .update({ revoked_at: null })
        .eq('id', apiKeyId)
    })

    test('should update last_used_at on successful auth', async () => {
      // Get initial last_used_at
      const { data: before } = await serviceSupabase
        .from('api_keys')
        .select('last_used_at')
        .eq('id', apiKeyId)
        .single()

      // Make authenticated request
      await fetch(`${SUPABASE_URL}/functions/v1/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: 'Test request',
        }),
      })

      // Check last_used_at was updated
      const { data: after } = await serviceSupabase
        .from('api_keys')
        .select('last_used_at')
        .eq('id', apiKeyId)
        .single()

      expect(after.last_used_at).not.toBe(before.last_used_at)
      expect(new Date(after.last_used_at).getTime()).toBeGreaterThan(
        before.last_used_at ? new Date(before.last_used_at).getTime() : 0
      )
    })

    test('should prefer API key over session auth', async () => {
      // Sign in to get session
      const { data: sessionData } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      })

      // Make request with both session and API key
      const response = await fetch(`${SUPABASE_URL}/functions/v1/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session!.access_token}`,
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          input: 'Test request with both auth methods',
        }),
      })

      expect(response.status).toBe(200)
      
      // TODO: Verify that API key was used by checking auth method in response
      // This would require the Edge Function to return the auth method used
    })
  })

  describe('API Key Management', () => {
    test('should list user API keys', async () => {
      const response = await fetch('/api/keys', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data.keys)).toBe(true)
      expect(data.data.keys.length).toBeGreaterThan(0)
      
      const testKey = data.data.keys.find((k: any) => k.name === 'Test API Key')
      expect(testKey).toBeDefined()
      expect(testKey.key_prefix).toBe(apiKey.substring(0, 12))
    })

    test('should create new API key', async () => {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          name: 'New Test Key',
          expiresInDays: 30,
          environment: 'test',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.key).toMatch(/^hke_test_/)
      expect(data.data.name).toBe('New Test Key')
      expect(data.data.expires_at).toBeDefined()

      // Clean up
      await serviceSupabase
        .from('api_keys')
        .delete()
        .eq('id', data.data.id)
    })

    test('should enforce 10 key limit', async () => {
      // Create 10 keys (we already have 1)
      const keyIds = []
      for (let i = 1; i < 10; i++) {
        const { data } = await serviceSupabase
          .from('api_keys')
          .insert({
            user_id: userId,
            name: `Limit Test Key ${i}`,
            key_hash: hashApiKey(`dummy-key-${i}`),
            key_prefix: 'hke_test_lim',
          })
          .select()
          .single()
        keyIds.push(data.id)
      }

      // Try to create 11th key
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          name: 'Over Limit Key',
          environment: 'test',
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('LIMIT_EXCEEDED')

      // Clean up
      for (const id of keyIds) {
        await serviceSupabase
          .from('api_keys')
          .delete()
          .eq('id', id)
      }
    })

    test('should revoke API key', async () => {
      // Create a key to revoke
      const { data: newKey } = await serviceSupabase
        .from('api_keys')
        .insert({
          user_id: userId,
          name: 'Key to Revoke',
          key_hash: hashApiKey('revoke-test-key'),
          key_prefix: 'hke_test_rev',
        })
        .select()
        .single()

      const response = await fetch(`/api/keys/${newKey.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          action: 'revoke',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)

      // Verify key was revoked
      const { data: revokedKey } = await serviceSupabase
        .from('api_keys')
        .select('revoked_at')
        .eq('id', newKey.id)
        .single()

      expect(revokedKey.revoked_at).toBeDefined()

      // Clean up
      await serviceSupabase
        .from('api_keys')
        .delete()
        .eq('id', newKey.id)
    })

    test('should delete API key', async () => {
      // Create a key to delete
      const { data: newKey } = await serviceSupabase
        .from('api_keys')
        .insert({
          user_id: userId,
          name: 'Key to Delete',
          key_hash: hashApiKey('delete-test-key'),
          key_prefix: 'hke_test_del',
        })
        .select()
        .single()

      const response = await fetch(`/api/keys/${newKey.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)

      // Verify key was deleted
      const { data: deletedKey } = await serviceSupabase
        .from('api_keys')
        .select('id')
        .eq('id', newKey.id)
        .single()

      expect(deletedKey).toBeNull()
    })
  })
})