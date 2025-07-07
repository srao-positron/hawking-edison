// Main orchestrator endpoint - the heart of Hawking Edison
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth } from '../_shared/auth.ts'
import { createResponse, createErrorResponse } from '../_shared/response.ts'
import { createLogger } from '../_shared/logger.ts'
import { llm, LLMProvider } from '../_shared/llm.ts'

const logger = createLogger('interact')

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
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
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
    // Record interaction start
    const { data: interaction, error: dbError } = await supabase
      .from('interactions')
      .insert({
        user_id: user!.id,
        input,
        tool_calls: [],
        result: {}
      })
      .select()
      .single()

    if (dbError) {
      logger.error('Failed to create interaction', dbError)
      return createErrorResponse('DB_ERROR', 'Failed to record interaction')
    }

    // Prepare system prompt
    const systemPrompt = `You are an intelligent orchestrator with access to various tools.
Your job is to understand the user's request and use the appropriate tools to fulfill it.

Available tools:
${Object.entries(tools).map(([name, tool]) => 
  `- ${name}: ${(tool as any).description || 'No description'}`
).join('\n')}

Always think step by step about how to best accomplish the user's goal.
Be creative in how you combine tools to solve problems.`

    // Call LLM
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: input }
    ]

    const startTime = Date.now()
    const llmResponse = await llm.complete(messages, { provider })
    const duration = Date.now() - startTime

    logger.info('LLM response received', {
      requestId,
      userId: user!.id,
      duration,
      tokens: llmResponse.usage?.totalTokens
    })

    // Update interaction with result
    await supabase
      .from('interactions')
      .update({
        result: {
          response: llmResponse.content,
          duration,
          tokens: llmResponse.usage
        }
      })
      .eq('id', interaction.id)

    return createResponse({
      interactionId: interaction.id,
      response: llmResponse.content,
      usage: llmResponse.usage
    })

  } catch (error) {
    logger.error('Request failed', error as Error, { requestId })
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    )
  }
})