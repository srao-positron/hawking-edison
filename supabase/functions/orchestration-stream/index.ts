// SSE endpoint for streaming orchestration events
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth } from '../_shared/auth.ts'
import { createErrorResponse } from '../_shared/response.ts'
import { createLogger } from '../_shared/logger.ts'
import { corsHeaders } from '../_shared/cors.ts'

const logger = createLogger('orchestration-stream')

// SSE headers for streaming
const sseHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no', // Disable Nginx buffering
}

interface StreamRequest {
  sessionId: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only accept GET requests with sessionId query param
  if (req.method !== 'GET') {
    return createErrorResponse('METHOD_NOT_ALLOWED', 'Only GET method allowed', 405)
  }

  try {
    // Verify authentication
    const { error: authError, user } = await verifyAuth(req)
    if (authError) {
      return authError
    }

    // Get sessionId from query params
    const url = new URL(req.url)
    const sessionId = url.searchParams.get('sessionId')
    
    if (!sessionId) {
      return createErrorResponse('INVALID_INPUT', 'sessionId required')
    }

    logger.info('Starting orchestration stream', {
      userId: user!.id,
      sessionId
    })

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('orchestration_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user!.id)
      .single()

    if (sessionError || !session) {
      return createErrorResponse('NOT_FOUND', 'Session not found')
    }

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Helper to send SSE events
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        // Send initial session info
        sendEvent('session_info', {
          sessionId: session.id,
          status: session.status,
          threadId: session.tool_state?.thread_id,
          startedAt: session.started_at,
          executionCount: session.execution_count
        })

        // Set up realtime subscription for orchestration events
        const channel = supabase
          .channel(`orchestration-events:${sessionId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'orchestration_events',
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              const event = payload.new as any
              
              // Map event types to SSE events
              switch (event.event_type) {
                case 'status_update':
                  sendEvent('status', {
                    from: event.event_data.from,
                    to: event.event_data.to,
                    message: event.event_data.message,
                    timestamp: event.created_at
                  })
                  break
                
                case 'tool_call':
                  sendEvent('tool_start', {
                    tool: event.event_data.tool,
                    arguments: event.event_data.arguments,
                    toolCallId: event.event_data.tool_call_id,
                    timestamp: event.created_at
                  })
                  break
                
                case 'tool_result':
                  sendEvent('tool_complete', {
                    tool: event.event_data.tool,
                    result: event.event_data.result,
                    success: event.event_data.success !== false,
                    duration: event.event_data.duration_ms,
                    error: event.event_data.error,
                    timestamp: event.created_at
                  })
                  break
                
                case 'agent_created':
                  sendEvent('agent_created', {
                    agentId: event.event_data.agent_id,
                    name: event.event_data.name,
                    specification: event.event_data.specification,
                    timestamp: event.created_at
                  })
                  break
                
                case 'agent_thought':
                  sendEvent('agent_thought', {
                    agentId: event.event_data.agent_id,
                    thought: event.event_data.thought,
                    isKeyDecision: event.event_data.is_key_decision,
                    thoughtType: event.event_data.thought_type,
                    timestamp: event.created_at
                  })
                  break
                
                case 'discussion_turn':
                  sendEvent('discussion_turn', {
                    agentId: event.event_data.agent_id,
                    agentName: event.event_data.agent_name,
                    message: event.event_data.message,
                    round: event.event_data.round,
                    timestamp: event.created_at
                  })
                  break
                
                case 'verification':
                  sendEvent('verification', {
                    goal: event.event_data.goal,
                    achieved: event.event_data.achieved,
                    confidence: event.event_data.confidence,
                    issues: event.event_data.issues,
                    timestamp: event.created_at
                  })
                  break
                
                case 'retry':
                  sendEvent('retry', {
                    reason: event.event_data.reason,
                    retryMessage: event.event_data.retry_message,
                    timestamp: event.created_at
                  })
                  break
                
                case 'error':
                  sendEvent('error', {
                    error: event.event_data.error,
                    context: event.event_data.context,
                    timestamp: event.created_at
                  })
                  break
                
                case 'context_compression':
                  sendEvent('context_compression', {
                    originalCount: event.event_data.original_message_count,
                    compressedCount: event.event_data.compressed_message_count,
                    timestamp: event.created_at
                  })
                  break
                
                default:
                  // Send generic event for unknown types
                  sendEvent('event', {
                    type: event.event_type,
                    data: event.event_data,
                    timestamp: event.created_at
                  })
              }
            }
          )
          .subscribe()

        // Also subscribe to session updates
        const sessionChannel = supabase
          .channel(`orchestration-sessions:${sessionId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orchestration_sessions',
              filter: `id=eq.${sessionId}`
            },
            (payload) => {
              const updatedSession = payload.new as any
              
              sendEvent('session_update', {
                status: updatedSession.status,
                completedAt: updatedSession.completed_at,
                finalResponse: updatedSession.final_response,
                error: updatedSession.error
              })
              
              // If session is complete, close the stream
              if (updatedSession.status === 'completed' || updatedSession.status === 'failed') {
                sendEvent('complete', {
                  status: updatedSession.status,
                  finalResponse: updatedSession.final_response,
                  error: updatedSession.error
                })
                
                // Clean up subscriptions
                channel.unsubscribe()
                sessionChannel.unsubscribe()
                
                // Close stream after a small delay
                setTimeout(() => controller.close(), 1000)
              }
            }
          )
          .subscribe()

        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            sendEvent('heartbeat', { 
              timestamp: new Date().toISOString(),
              sessionId 
            })
          } catch (e) {
            // Connection closed, clean up
            clearInterval(heartbeatInterval)
            channel.unsubscribe()
            sessionChannel.unsubscribe()
          }
        }, 30000)

        // Handle client disconnect
        req.signal.addEventListener('abort', () => {
          logger.info('Client disconnected', { sessionId })
          clearInterval(heartbeatInterval)
          channel.unsubscribe()
          sessionChannel.unsubscribe()
          controller.close()
        })

        // If session is already complete, send final state
        if (session.status === 'completed' || session.status === 'failed') {
          sendEvent('complete', {
            status: session.status,
            finalResponse: session.final_response,
            error: session.error
          })
          clearInterval(heartbeatInterval)
          controller.close()
        }
      }
    })

    return new Response(stream, { headers: sseHeaders })

  } catch (error) {
    logger.error('Streaming failed', error)
    
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})