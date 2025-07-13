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
    console.log('[INTERACT] Starting request processing', { requestId, method: req.method })
    
    // Verify authentication
    console.log('[INTERACT] Verifying authentication...')
    const { error: authError, user } = await verifyAuth(req)
    if (authError) {
      console.log('[INTERACT] Auth failed:', authError)
      return authError
    }
    console.log('[INTERACT] Auth successful, userId:', user!.id)

    // Parse request
    console.log('[INTERACT] Parsing request body...')
    const body: InteractRequest = await req.json()
    const { input, provider, context, mode = 'async' } = body
    console.log('[INTERACT] Request body:', { 
      hasInput: !!input, 
      inputLength: input?.length, 
      provider, 
      mode,
      contextKeys: context ? Object.keys(context) : []
    })

    if (!input || typeof input !== 'string') {
      console.log('[INTERACT] Invalid input provided')
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
    console.log('[INTERACT] Initializing Supabase client...')
    console.log('[INTERACT] Environment check:', {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasAwsKey: !!Deno.env.get('AWS_ACCESS_KEY_ID'),
      hasAwsSecret: !!Deno.env.get('AWS_SECRET_ACCESS_KEY'),
      hasSnsTopic: !!Deno.env.get('AWS_SNS_TOPIC_ARN'),
      enableOrchestration: Deno.env.get('ENABLE_ORCHESTRATION')
    })
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if we should use async orchestration
    if (mode === 'async' && Deno.env.get('ENABLE_ORCHESTRATION') === 'true') {
      // Handle chat thread - get threadId from context
      let threadId = context?.sessionId
      let messages: any[] = []
      let isNewThread = false
      let threadTitle: string | null = null
      
      // Load existing thread messages if threadId provided
      if (threadId) {
        const { data: existingMessages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true })
        
        if (messagesError) {
          logger.warn('Failed to load thread messages', { threadId, error: messagesError })
        } else if (existingMessages) {
          messages = existingMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }
      } else {
        // Create new thread
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
          return createErrorResponse('DB_ERROR', 'Failed to create conversation thread')
        }
        
        threadId = thread.id
        isNewThread = true
      }
      
      // Save user message
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
      
      // Update thread message count
      const { error: threadUpdateError } = await supabase
        .from('chat_threads')
        .update({
          message_count: messages.length + 1, // existing messages + new user message
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', threadId)
      
      if (threadUpdateError) {
        logger.warn('Failed to update thread message count', threadUpdateError)
      }
      
      // Prepare all messages for orchestration
      const allMessages = [
        ...messages,
        { role: 'user' as const, content: input }
      ]
      
      // Add token counts
      const messagesWithTokens = allMessages.map(msg => ({
        ...msg,
        tokens: Math.ceil(msg.content.length / 4) // Rough estimate
      }))
      
      // Check if we're approaching context limits
      const totalTokens = messagesWithTokens.reduce((sum, msg) => sum + (msg.tokens || 0), 0)
      const needsCompression = totalTokens > 80000 // 80% of Claude's 100k limit
      
      // Create orchestration session with thread context
      const { data: session, error: sessionError } = await supabase
        .from('orchestration_sessions')
        .insert({
          user_id: user!.id,
          status: 'pending',
          messages: messagesWithTokens,
          tool_state: {
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

      logger.info('Created orchestration session', {
        sessionId: session.id,
        userId: user!.id,
        threadId: threadId
      })
      
      // Publish to SNS to start orchestration
      console.log('[INTERACT] About to call publishToSNS for session:', session.id)
      const snsMessage = {
        sessionId: session.id,
        action: 'start' as const,
        userId: user!.id,
        input
      }
      console.log('[INTERACT] SNS message to publish:', JSON.stringify(snsMessage))
      
      const published = await publishToSNS(snsMessage)
      
      console.log('[INTERACT] publishToSNS returned:', published)
      logger.info('SNS publish result', { published, sessionId: session.id })
      
      if (!published) {
        // SNS publish failed - return error
        logger.error('Failed to publish to SNS for async processing')
        return createErrorResponse('SERVICE_ERROR', 'Failed to initiate processing. Please try again.')
      }

      // Return the session ID and thread info
      return createResponse({
        sessionId: session.id,
        threadId: threadId,
        threadTitle: isNewThread ? threadTitle : undefined,
        isNewThread: isNewThread,
        status: 'processing',
        message: 'Processing your request...',
        async: true,
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
    console.log('[INTERACT] Using orchestration:', useOrchestration)
    
    if (useOrchestration) {
      // Prepare messages with token counts for context management
      const allMessages = [
        ...messages,
        { role: 'user' as const, content: input }
      ]
      console.log('[INTERACT] Total messages in thread:', allMessages.length)
      
      // Add token counts to messages (rough estimate for Edge Function)
      const messagesWithTokens = allMessages.map(msg => ({
        ...msg,
        tokens: Math.ceil(msg.content.length / 4) // Rough estimate
      }))
      
      // Check if we're approaching context limits
      const totalTokens = messagesWithTokens.reduce((sum, msg) => sum + (msg.tokens || 0), 0)
      const needsCompression = totalTokens > 80000 // 80% of Claude's 100k limit
      console.log('[INTERACT] Token count:', { totalTokens, needsCompression })
      
      // Create orchestration session
      console.log('[INTERACT] Creating orchestration session...')
      const { data: session, error: sessionError } = await supabase
        .from('orchestration_sessions')
        .insert({
          user_id: user!.id,
          status: 'pending',
          messages: messagesWithTokens,
          tool_state: {
            thread_id: threadId,
            provider: provider || 'claude-3-opus',
            needs_compression: needsCompression,
            total_tokens: totalTokens
          }
        })
        .select()
        .single()
      
      if (sessionError) {
        console.error('[INTERACT] Failed to create orchestration session:', sessionError)
        logger.error('Failed to create orchestration session', sessionError)
        return createErrorResponse('DB_ERROR', 'Failed to create orchestration session')
      }
      
      console.log('[INTERACT] Created orchestration session:', session.id)
      
      // Publish to SNS to start orchestration
      console.log('[INTERACT] About to call publishToSNS for session:', session.id)
      logger.info('Attempting to publish to SNS', { sessionId: session.id })
      
      const snsMessage = {
        sessionId: session.id,
        action: 'start' as const,
        userId: user!.id,
        input
      }
      console.log('[INTERACT] SNS message to publish:', JSON.stringify(snsMessage))
      
      const published = await publishToSNS(snsMessage)
      
      console.log('[INTERACT] publishToSNS returned:', published)
      logger.info('SNS publish result', { published, sessionId: session.id })
      
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