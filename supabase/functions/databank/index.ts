// Databank API - Knowledge management endpoint
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth } from '../_shared/auth.ts'
import { createResponse, createErrorResponse } from '../_shared/response.ts'
import { createLogger } from '../_shared/logger.ts'

const logger = createLogger('databank')

interface AddKnowledgeRequest {
  content: string
  url: string
  metadata?: Record<string, any>
}

interface SearchKnowledgeRequest {
  query: string
  limit?: number
  threshold?: number
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID()
  const url = new URL(req.url)
  const pathSegments = url.pathname.split('/').filter(Boolean)
  const action = pathSegments[pathSegments.length - 1] // Last segment after /databank/

  logger.info('Request received', { 
    requestId,
    method: req.method,
    action,
    url: req.url 
  })

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }

  // Verify authentication
  const { error: authError, user } = await verifyAuth(req)
  if (authError) {
    return authError
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Handle different actions
    switch (action) {
      case 'add':
        if (req.method !== 'POST') {
          return createErrorResponse('METHOD_NOT_ALLOWED', 'POST method required', 405)
        }
        return await handleAddKnowledge(req, user!.id, supabase, requestId)

      case 'search':
        if (req.method !== 'POST') {
          return createErrorResponse('METHOD_NOT_ALLOWED', 'POST method required', 405)
        }
        return await handleSearchKnowledge(req, user!.id, supabase, requestId)

      case 'list':
        if (req.method !== 'GET') {
          return createErrorResponse('METHOD_NOT_ALLOWED', 'GET method required', 405)
        }
        return await handleListKnowledge(user!.id, supabase, requestId)

      default:
        return createErrorResponse('NOT_FOUND', 'Unknown databank action', 404)
    }
  } catch (error) {
    logger.error('Request failed', error as Error, { requestId })
    return createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500)
  }
})

async function handleAddKnowledge(
  req: Request,
  userId: string,
  supabase: any,
  requestId: string
) {
  const body: AddKnowledgeRequest = await req.json()
  const { content, url, metadata } = body

  if (!content || !url) {
    return createErrorResponse('INVALID_INPUT', 'Content and URL required')
  }

  logger.info('Adding knowledge', { requestId, userId, contentLength: content.length })

  // TODO: Generate embedding using OpenAI or another provider
  // For now, we'll store without embedding
  const { data, error } = await supabase
    .from('knowledge')
    .insert({
      user_id: userId,
      content,
      url,
      metadata: metadata || {},
      // embedding will be added when we integrate embedding service
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to add knowledge', error, { requestId, userId })
    return createErrorResponse('DB_ERROR', 'Failed to add knowledge')
  }

  return createResponse({ id: data.id, message: 'Knowledge added successfully' })
}

async function handleSearchKnowledge(
  req: Request,
  userId: string,
  supabase: any,
  requestId: string
) {
  const body: SearchKnowledgeRequest = await req.json()
  const { query, limit = 10, threshold = 0.5 } = body

  if (!query) {
    return createErrorResponse('INVALID_INPUT', 'Query required')
  }

  logger.info('Searching knowledge', { requestId, userId, query })

  // TODO: Generate query embedding and use vector search
  // For now, we'll do a simple text search
  const { data, error } = await supabase
    .from('knowledge')
    .select('id, content, url, metadata, created_at')
    .eq('user_id', userId)
    .textSearch('content', query)
    .limit(limit)

  if (error) {
    logger.error('Failed to search knowledge', error, { requestId, userId })
    return createErrorResponse('DB_ERROR', 'Failed to search knowledge')
  }

  return createResponse({ results: data || [], query })
}

async function handleListKnowledge(
  userId: string,
  supabase: any,
  requestId: string
) {
  logger.info('Listing knowledge', { requestId, userId })

  const { data, error } = await supabase
    .from('knowledge')
    .select('id, url, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    logger.error('Failed to list knowledge', error, { requestId, userId })
    return createErrorResponse('DB_ERROR', 'Failed to list knowledge')
  }

  return createResponse({ items: data || [] })
}