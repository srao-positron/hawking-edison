import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createErrorResponse } from './response.ts'
import { createHash } from "https://deno.land/std@0.224.0/crypto/crypto.ts"

export interface AuthUser {
  id: string
  email?: string
  authMethod: 'session' | 'api-key'
  apiKeyId?: string
  apiKeyName?: string
}

// Extract API key from various sources
function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer hke_')) {
    return authHeader.substring(7)
  }
  
  const apiKeyHeader = req.headers.get('X-API-Key')
  if (apiKeyHeader?.startsWith('hke_')) {
    return apiKeyHeader
  }
  
  const url = new URL(req.url)
  const apiKeyParam = url.searchParams.get('api_key')
  if (apiKeyParam?.startsWith('hke_')) {
    return apiKeyParam
  }
  
  return null
}

// Verify API key authentication
async function verifyApiKeyAuth(apiKey: string): Promise<{ error: Response | null, user: AuthUser | null }> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // Hash the API key
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Look up the API key
  const { data: apiKeyRecord, error } = await supabase
    .from('api_keys')
    .select('id, user_id, name, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .single()
  
  if (error || !apiKeyRecord) {
    return {
      error: createErrorResponse('AUTH_INVALID', 'Invalid API key', 401),
      user: null
    }
  }
  
  // Check if revoked
  if (apiKeyRecord.revoked_at) {
    return {
      error: createErrorResponse('AUTH_INVALID', 'API key has been revoked', 401),
      user: null
    }
  }
  
  // Check if expired
  if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
    return {
      error: createErrorResponse('AUTH_INVALID', 'API key has expired', 401),
      user: null
    }
  }
  
  // Update last used timestamp
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKeyRecord.id)
  
  // Get user email
  const { data: userData } = await supabase
    .from('auth.users')
    .select('email')
    .eq('id', apiKeyRecord.user_id)
    .single()
  
  return {
    error: null,
    user: {
      id: apiKeyRecord.user_id,
      email: userData?.email,
      authMethod: 'api-key',
      apiKeyId: apiKeyRecord.id,
      apiKeyName: apiKeyRecord.name
    }
  }
}

// Verify session authentication
async function verifySessionAuth(req: Request): Promise<{ error: Response | null, user: AuthUser | null }> {
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: createErrorResponse('AUTH_REQUIRED', 'Authorization header required', 401),
      user: null
    }
  }

  const token = authHeader.replace('Bearer ', '')
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: authHeader }
      }
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return {
      error: createErrorResponse('AUTH_INVALID', 'Invalid authentication token', 401),
      user: null
    }
  }

  return {
    error: null,
    user: {
      id: user.id,
      email: user.email,
      authMethod: 'session'
    }
  }
}

// Unified authentication function
export async function verifyAuth(req: Request): Promise<{ error: Response | null, user: AuthUser | null }> {
  // First check for API key
  const apiKey = extractApiKey(req)
  if (apiKey) {
    return verifyApiKeyAuth(apiKey)
  }
  
  // Fall back to session auth
  return verifySessionAuth(req)
}

// Legacy function for backward compatibility
export async function verifyApiKey(req: Request) {
  const apiKey = extractApiKey(req)
  
  if (!apiKey) {
    return {
      error: createErrorResponse('API_KEY_REQUIRED', 'API key required', 401),
      userId: null
    }
  }
  
  const result = await verifyApiKeyAuth(apiKey)
  return {
    error: result.error,
    userId: result.user?.id || null
  }
}