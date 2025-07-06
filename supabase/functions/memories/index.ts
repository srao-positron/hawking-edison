// Memories API - Agent memory management
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth } from '../_shared/auth.ts'
import { createResponse, createErrorResponse } from '../_shared/response.ts'
import { createLogger } from '../_shared/logger.ts'

const logger = createLogger('memories')

interface SaveMemoryRequest {
  streamName: string
  content: any
  interactionId?: string
}

interface SearchMemoriesRequest {
  query: string
  streamName?: string
  limit?: number
}

interface GetMemoriesRequest {
  streamName: string
  limit?: number
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID()
  const url = new URL(req.url)
  const pathSegments = url.pathname.split('/').filter(Boolean)
  const action = pathSegments[pathSegments.length - 1]

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
    switch (action) {
      case 'save':
        if (req.method !== 'POST') {
          return createErrorResponse('METHOD_NOT_ALLOWED', 'POST method required', 405)
        }
        return await handleSaveMemory(req, user!.id, supabase, requestId)

      case 'search':
        if (req.method !== 'POST') {
          return createErrorResponse('METHOD_NOT_ALLOWED', 'POST method required', 405)
        }
        return await handleSearchMemories(req, user!.id, supabase, requestId)

      case 'get':
        if (req.method !== 'POST') {
          return createErrorResponse('METHOD_NOT_ALLOWED', 'POST method required', 405)
        }
        return await handleGetMemories(req, user!.id, supabase, requestId)

      case 'streams':
        if (req.method !== 'GET') {
          return createErrorResponse('METHOD_NOT_ALLOWED', 'GET method required', 405)
        }
        return await handleListStreams(user!.id, supabase, requestId)

      default:
        return createErrorResponse('NOT_FOUND', 'Unknown memories action', 404)
    }
  } catch (error) {
    logger.error('Request failed', error as Error, { requestId })
    return createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500)
  }
})

async function handleSaveMemory(
  req: Request,
  userId: string,
  supabase: any,
  requestId: string
) {
  const body: SaveMemoryRequest = await req.json()
  const { streamName, content, interactionId } = body

  if (!streamName || !content) {
    return createErrorResponse('INVALID_INPUT', 'Stream name and content required')
  }

  logger.info('Saving memory', { 
    requestId, 
    userId, 
    streamName,
    interactionId 
  })

  const { data, error } = await supabase
    .from('agent_memories')
    .insert({
      user_id: userId,
      stream_name: streamName,
      content,
      interaction_id: interactionId
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to save memory', error, { requestId, userId })
    return createErrorResponse('DB_ERROR', 'Failed to save memory')
  }

  return createResponse({ 
    id: data.id, 
    message: 'Memory saved successfully' 
  })
}

async function handleSearchMemories(
  req: Request,
  userId: string,
  supabase: any,
  requestId: string
) {
  const body: SearchMemoriesRequest = await req.json()
  const { query, streamName, limit = 10 } = body

  if (!query) {
    return createErrorResponse('INVALID_INPUT', 'Query required')
  }

  logger.info('Searching memories', { 
    requestId, 
    userId, 
    query,
    streamName 
  })

  // Build query
  let dbQuery = supabase
    .from('agent_memories')
    .select('*')
    .eq('user_id', userId)

  if (streamName) {
    dbQuery = dbQuery.eq('stream_name', streamName)
  }

  // Search in content JSONB
  dbQuery = dbQuery.contains('content', { query })
    .order('created_at', { ascending: false })
    .limit(limit)

  const { data, error } = await dbQuery

  if (error) {
    logger.error('Failed to search memories', error, { requestId, userId })
    return createErrorResponse('DB_ERROR', 'Failed to search memories')
  }

  return createResponse({ 
    results: data || [], 
    query,
    streamName 
  })
}

async function handleGetMemories(
  req: Request,
  userId: string,
  supabase: any,
  requestId: string
) {
  const body: GetMemoriesRequest = await req.json()
  const { streamName, limit = 50 } = body

  if (!streamName) {
    return createErrorResponse('INVALID_INPUT', 'Stream name required')
  }

  logger.info('Getting memories', { 
    requestId, 
    userId, 
    streamName 
  })

  const { data, error } = await supabase
    .from('agent_memories')
    .select('*')
    .eq('user_id', userId)
    .eq('stream_name', streamName)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('Failed to get memories', error, { requestId, userId })
    return createErrorResponse('DB_ERROR', 'Failed to get memories')
  }

  return createResponse({ 
    memories: data || [], 
    streamName,
    count: data?.length || 0
  })
}

async function handleListStreams(
  userId: string,
  supabase: any,
  requestId: string
) {
  logger.info('Listing memory streams', { requestId, userId })

  // Get unique stream names
  const { data, error } = await supabase
    .from('agent_memories')
    .select('stream_name')
    .eq('user_id', userId)

  if (error) {
    logger.error('Failed to list streams', error, { requestId, userId })
    return createErrorResponse('DB_ERROR', 'Failed to list memory streams')
  }

  // Extract unique stream names
  const uniqueStreams = [...new Set(data?.map((m: any) => m.stream_name) || [])]

  return createResponse({ 
    streams: uniqueStreams,
    count: uniqueStreams.length
  })
}