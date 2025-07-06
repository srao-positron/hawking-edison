import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createErrorResponse } from './response.ts'

export async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader) {
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

  return { error: null, user }
}

// For API key authentication (future use)
export async function verifyApiKey(req: Request) {
  const apiKey = req.headers.get('X-API-Key')
  
  if (!apiKey) {
    return {
      error: createErrorResponse('API_KEY_REQUIRED', 'X-API-Key header required', 401),
      userId: null
    }
  }

  // TODO: Implement API key verification against database
  // For now, return error
  return {
    error: createErrorResponse('API_KEY_INVALID', 'API key authentication not yet implemented', 501),
    userId: null
  }
}