import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'
import { verifyAuth } from '../_shared/auth.ts'
import { createResponse, createErrorResponse } from '../_shared/response.ts'
import { createLogger } from '../_shared/logger.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { generateApiKey } from '../_shared/api-key-utils.ts'

const logger = createLogger('auth-api-keys')

interface CreateKeyRequest {
  name: string
  expiresInDays?: number
  environment?: 'live' | 'test'
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID()
  const url = new URL(req.url)
  const pathname = url.pathname
  
  logger.info('Request received', { 
    requestId, 
    method: req.method,
    pathname,
    headers: Object.fromEntries(req.headers.entries())
  })
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  // Verify authentication
  const { error: authError, user } = await verifyAuth(req)
  if (authError) {
    logger.error('Authentication failed', new Error('Auth failed'), { requestId })
    return authError
  }
  
  logger.info('User authenticated', { requestId, userId: user.id })
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing environment variables', new Error('Config error'), { 
      requestId, 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseKey 
    })
    return createErrorResponse('CONFIG_ERROR', 'Missing configuration', 500, origin)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Extract action from path: /auth-api-keys/{action}
    const pathParts = pathname.split('/').filter(Boolean)
    const action = pathParts[pathParts.length - 1]
    
    // Route based on method and action
    if (req.method === 'GET' && action === 'auth-api-keys') {
      // List API keys - select actual columns from production
      const { data: keys, error } = await supabase
        .from('api_keys')
        .select('id, name, created_at, last_used, expires_at, is_active, key_prefix')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        logger.error('Failed to fetch API keys', error, { requestId, userId: user.id })
        return createErrorResponse('DATABASE_ERROR', 'Failed to fetch API keys', 500, origin)
      }
      
      const formattedKeys = keys.map(key => ({
        ...key,
        revoked_at: null, // Using is_active instead
        isActive: key.is_active && (!key.expires_at || new Date(key.expires_at) > new Date()),
        isExpired: key.expires_at && new Date(key.expires_at) <= new Date(),
        isRevoked: !key.is_active
      }))
      
      logger.info('API keys fetched', { requestId, count: keys.length })
      return createResponse({ keys: formattedKeys }, undefined, origin)
      
    } else if (req.method === 'POST' && action === 'auth-api-keys') {
      // Create new API key
      const body = await req.json() as CreateKeyRequest
      
      if (!body.name || body.name.trim() === '') {
        return createErrorResponse('VALIDATION_ERROR', 'Name is required', 400, origin)
      }
      
      // Check existing keys limit
      const { data: existingKeys } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id)
        .is('revoked_at', null)
      
      if (existingKeys && existingKeys.length >= 10) {
        return createErrorResponse('LIMIT_EXCEEDED', 'Maximum of 10 active API keys allowed', 400, origin)
      }
      
      // Generate new API key
      const { key, hash, prefix } = generateApiKey(body.environment || 'live')
      
      let expiresAt = null
      if (body.expiresInDays) {
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + body.expiresInDays)
        expiresAt = expiryDate.toISOString()
      }
      
      // Insert API key with all required columns
      const insertData: any = {
        user_id: user.id,
        name: body.name,
        key_hash: hash,
        key_prefix: prefix,
        is_active: true,
        expires_at: expiresAt
      }
      
      const { data: apiKey, error } = await supabase
        .from('api_keys')
        .insert(insertData)
        .select('id, name, created_at, expires_at')
        .single()
      
      if (error) {
        logger.error('Failed to create API key', error, { requestId, userId: user.id })
        return createErrorResponse('DATABASE_ERROR', 'Failed to create API key', 500, origin)
      }
      
      logger.info('API key created', { requestId, keyId: apiKey.id })
      return createResponse({ ...apiKey, key, key_prefix: prefix }, undefined, origin)
      
    } else if (req.method === 'PATCH' && action !== 'auth-api-keys') {
      // Revoke API key
      const keyId = action
      const body = await req.json()
      
      if (body.action !== 'revoke') {
        return createErrorResponse('VALIDATION_ERROR', 'Invalid action', 400, origin)
      }
      
      // Update is_active to false to revoke the key
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId)
        .eq('user_id', user.id)
      
      if (error) {
        logger.error('Failed to revoke API key', error, { requestId, keyId })
        return createErrorResponse('DATABASE_ERROR', 'Failed to revoke API key', 500, origin)
      }
      
      logger.info('API key revoked', { requestId, keyId })
      return createResponse({ message: 'API key revoked successfully' }, undefined, origin)
      
    } else if (req.method === 'DELETE' && action !== 'auth-api-keys') {
      // Delete API key
      const keyId = action
      
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)
        .eq('user_id', user.id)
      
      if (error) {
        logger.error('Failed to delete API key', error, { requestId, keyId })
        return createErrorResponse('DATABASE_ERROR', 'Failed to delete API key', 500, origin)
      }
      
      logger.info('API key deleted', { requestId, keyId })
      return createResponse({ message: 'API key deleted successfully' }, undefined, origin)
      
    } else {
      return createErrorResponse('NOT_FOUND', 'Invalid endpoint', 404, origin)
    }
    
  } catch (error) {
    logger.error('Request failed', error as Error, { requestId })
    return createErrorResponse('INTERNAL_ERROR', 'An error occurred', 500, origin)
  }
})