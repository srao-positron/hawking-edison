import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'

export interface AuthUser {
  id: string
  email?: string
  authMethod: 'session' | 'api-key'
  apiKeyId?: string
  apiKeyName?: string
}

async function authenticateWithSession(request: NextRequest, cookieStore: any): Promise<AuthUser | null> {
  const supabase = createClient(cookieStore)
  
  // First try to get user from cookies (standard session)
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (!error && user) {
    return {
      id: user.id,
      email: user.email,
      authMethod: 'session'
    }
  }
  
  // If no cookie session, check for Bearer token with Supabase JWT
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ') && !authHeader.includes('hke_')) {
    const token = authHeader.substring(7)
    
    try {
      // Verify the JWT token
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      
      if (!tokenError && tokenUser) {
        return {
          id: tokenUser.id,
          email: tokenUser.email,
          authMethod: 'session'
        }
      }
    } catch (e) {
      // Invalid token
    }
  }
  
  return null
}

async function authenticateWithApiKey(apiKey: string): Promise<AuthUser | null> {
  const supabase = createClient(await cookies())
  
  const keyHash = createHash('sha256').update(apiKey).digest('hex')
  
  const { data: apiKeyRecord, error } = await supabase
    .from('api_keys')
    .select('id, user_id, name, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .single()
  
  if (error || !apiKeyRecord) {
    return null
  }
  
  if (apiKeyRecord.revoked_at) {
    return null
  }
  
  if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
    return null
  }
  
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKeyRecord.id)
  
  const { data: userData } = await supabase
    .from('auth.users')
    .select('email')
    .eq('id', apiKeyRecord.user_id)
    .single()
  
  return {
    id: apiKeyRecord.user_id,
    email: userData?.email,
    authMethod: 'api-key',
    apiKeyId: apiKeyRecord.id,
    apiKeyName: apiKeyRecord.name
  }
}

function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer hke_')) {
    return authHeader.substring(7)
  }
  
  const apiKeyHeader = request.headers.get('x-api-key')
  if (apiKeyHeader?.startsWith('hke_')) {
    return apiKeyHeader
  }
  
  const searchParams = new URL(request.url).searchParams
  const apiKeyParam = searchParams.get('api_key')
  if (apiKeyParam?.startsWith('hke_')) {
    return apiKeyParam
  }
  
  return null
}

export async function authenticate(request: NextRequest): Promise<AuthUser | null> {
  const apiKey = extractApiKey(request)
  if (apiKey) {
    return authenticateWithApiKey(apiKey)
  }
  
  const cookieStore = await cookies()
  return authenticateWithSession(request, cookieStore)
}

export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await authenticate(request)
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
}