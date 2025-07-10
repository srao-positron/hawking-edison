// Main orchestrator endpoint - the heart of Hawking Edison
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth } from '../_shared/auth.ts'
import { createResponse, createErrorResponse } from '../_shared/response.ts'
import { createLogger } from '../_shared/logger.ts'
import { llm, LLMProvider } from '../_shared/llm.ts'
import { publishToSNS, shouldUseOrchestration } from '../_shared/aws-sns.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { generateHumanId } from '../_shared/human-id.ts'

const logger = createLogger('interact')

// Helper function to generate thread title from first message
function generateThreadTitle(input: string): string {
  // Truncate and clean up the input for a title
  const cleanInput = input.trim()
    .replace(/[\n\r]+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 100) // Limit length
  
  // If it's a question, use the question as title
  if (cleanInput.endsWith('?')) {
    return cleanInput.length > 50 ? cleanInput.substring(0, 47) + '...' : cleanInput
  }
  
  // For statements, truncate at a reasonable point
  const truncated = cleanInput.length > 50 ? cleanInput.substring(0, 47) + '...' : cleanInput
  
  // If it starts with common command phrases, preserve them
  const commandPhrases = ['write', 'create', 'help', 'explain', 'show', 'tell', 'make', 'generate', 'find', 'search']
  const firstWord = cleanInput.toLowerCase().split(' ')[0]
  if (commandPhrases.includes(firstWord)) {
    return truncated
  }
  
  return truncated
}

// Tool registry - will be expanded as we add tools
const tools = {
  // Placeholder for tool implementations
  // Will be populated with createAgent, runDiscussion, etc.
  // Tools coming soon!
}

interface InteractRequest {
  input: string
  provider?: LLMProvider
  context?: {
    conversationId?: string
    sessionId?: string // Chat thread ID
    [key: string]: any
  }
  mode?: 'sync' | 'async' // Default to async for long-running operations
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID()
  
  logger.info('Request received', { 
    requestId,
    method: req.method,
    url: req.url 
  })

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return createErrorResponse('METHOD_NOT_ALLOWED', 'Only POST method allowed', 405)
  }

  try {
    // Verify authentication
    const { error: authError, user } = await verifyAuth(req)
    if (authError) {
      return authError
    }

    // Parse request
    const body: InteractRequest = await req.json()
    const { input, provider, context, mode = 'async' } = body

    if (!input || typeof input !== 'string') {
      return createErrorResponse('INVALID_INPUT', 'Input string required')
    }

    logger.info('Processing interaction', {
      requestId,
      userId: user!.id,
      inputLength: input.length,
      provider: provider || 'default',
      mode
    })

    // Initialize Supabase client with user context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if we should use async orchestration
    if (mode === 'async' && Deno.env.get('ENABLE_ORCHESTRATION') === 'true') {
      // Create orchestration session
      const { data: session, error: sessionError } = await supabase
        .from('orchestration_sessions')
        .insert({
          user_id: user!.id,
          status: 'pending',
          messages: [{
            role: 'user',
            content: input
          }]
        })
        .select()
        .single()
      
      if (sessionError) {
        logger.error('Failed to create orchestration session', sessionError)
        return createErrorResponse('DB_ERROR', 'Failed to create orchestration session')
      }

      // Publish to SNS to start orchestration
      // Note: In Edge Functions, we can't use AWS SDK directly
      // Instead, we'll use a webhook or mark the session for Lambda to pick up
      logger.info('Created orchestration session', {
        sessionId: session.id,
        userId: user!.id
      })

      // For now, return the session ID so frontend can subscribe to updates
      return createResponse({
        sessionId: session.id,
        status: 'processing',
        message: 'Your request is being processed. Subscribe to updates using the session ID.',
        realtime: {
          channel: `orchestration:${session.id}`,
          event: 'orchestration_sessions',
          filter: `id=eq.${session.id}`
        }
      })
    }

    // Fallback to synchronous processing for simple requests
    // Handle chat thread
    let threadId = context?.sessionId
    let messages: any[] = []
    let isNewThread = false
    let threadTitle: string | null = null
    
    // Create or get thread
    if (!threadId) {
      // Create new thread with auto-generated title and human-readable ID
      threadTitle = generateThreadTitle(input)
      const humanId = generateHumanId()
      const { data: thread, error: threadError } = await supabase
        .from('chat_threads')
        .insert({
          id: humanId,
          user_id: user!.id,
          title: threadTitle,
          metadata: {}
        })
        .select()
        .single()
      
      if (threadError) {
        logger.error('Failed to create thread', threadError)
        return createErrorResponse('DB_ERROR', 'Failed to create chat thread')
      }
      
      threadId = thread.id
      isNewThread = true
    } else {
      // Verify thread exists and belongs to user
      const { data: thread, error: threadError } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('id', threadId)
        .eq('user_id', user!.id)
        .single()
      
      if (threadError || !thread) {
        logger.warn('Thread not found or unauthorized, creating new thread', { 
          threadId, 
          userId: user!.id,
          error: threadError 
        })
        
        // Create new thread instead
        threadTitle = generateThreadTitle(input)
        const newHumanId = generateHumanId()
        const { data: newThread, error: createError } = await supabase
          .from('chat_threads')
          .insert({
            id: newHumanId,
            user_id: user!.id,
            title: threadTitle,
            metadata: {}
          })
          .select()
          .single()
        
        if (createError) {
          logger.error('Failed to create new thread', createError)
          return createErrorResponse('DB_ERROR', 'Failed to create chat thread')
        }
        
        threadId = newThread.id
        isNewThread = true
        messages = [] // Start fresh with new thread
      } else {
        // Get existing thread messages
        const { data: existingMessages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true })
        
        if (messagesError) {
          logger.error('Failed to get messages', messagesError)
          return createErrorResponse('DB_ERROR', 'Failed to get thread messages')
        }
        
        messages = existingMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      }
    }
    
    // Add user message to thread
    const { data: userMessage, error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        user_id: user!.id,
        role: 'user',
        content: input
      })
      .select()
      .single()
    
    if (userMsgError) {
      logger.error('Failed to save user message', userMsgError)
      return createErrorResponse('DB_ERROR', 'Failed to save message')
    }
    
    // ALWAYS use orchestration for LLM requests to avoid Edge Function timeouts
    const useOrchestration = true
    
    if (useOrchestration) {
      // Prepare messages with token counts for context management
      const allMessages = [
        ...messages,
        { role: 'user' as const, content: input }
      ]
      
      // Add token counts to messages (rough estimate for Edge Function)
      const messagesWithTokens = allMessages.map(msg => ({
        ...msg,
        tokens: Math.ceil(msg.content.length / 4) // Rough estimate
      }))
      
      // Check if we're approaching context limits
      const totalTokens = messagesWithTokens.reduce((sum, msg) => sum + (msg.tokens || 0), 0)
      const needsCompression = totalTokens > 80000 // 80% of Claude's 100k limit
      
      // Create orchestration session
      const { data: session, error: sessionError } = await supabase
        .from('orchestration_sessions')
        .insert({
          user_id: user!.id,
          status: 'pending',
          messages: messagesWithTokens,
          metadata: {
            thread_id: threadId,
            provider: provider || 'claude-3-opus',
            needs_compression: needsCompression,
            total_tokens: totalTokens
          }
        })
        .select()
        .single()
      
      if (sessionError) {
        logger.error('Failed to create orchestration session', sessionError)
        return createErrorResponse('DB_ERROR', 'Failed to create orchestration session')
      }
      
      // Publish to SNS to start orchestration
      const published = await publishToSNS({
        sessionId: session.id,
        action: 'start',
        userId: user!.id,
        input
      })
      
      if (!published) {
        // SNS publish failed - return error
        logger.error('Failed to publish to SNS for async processing')
        return createErrorResponse('SERVICE_ERROR', 'Failed to initiate processing. Please try again.')
      }
      
      // Return immediately with session ID for async processing
      return createResponse({
        sessionId: session.id,
        threadId: threadId,
        threadTitle: isNewThread ? threadTitle : undefined,
        isNewThread: isNewThread,
        status: 'processing',
        message: 'Processing your request...',
        async: true
      })
    }

    // This code path should never be reached since we always use orchestration
    logger.error('Unexpected code path - synchronous processing attempted')
    return createErrorResponse('INTERNAL_ERROR', 'System configuration error')

  } catch (error) {
    logger.error('Request failed', error as Error, { requestId })
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    )
  }
})