import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const sessionId = url.searchParams.get('sessionId')
  
  if (!sessionId) {
    return new Response('Missing sessionId parameter', {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    })
  }

  // Get auth header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    })
  }

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Verify user from JWT
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    })
  }

  // Verify session belongs to user
  const { data: session, error: sessionError } = await supabase
    .from('orchestration_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (sessionError || !session) {
    return new Response('Session not found', {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    })
  }

  // Create SSE response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial status
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'status',
        status: session.status,
        progress: session.progress || 0
      })}\n\n`))

      // Set up realtime subscription
      const channel = supabase
        .channel(`session-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orchestration_sessions',
            filter: `id=eq.${sessionId}`
          },
          (payload) => {
            const update = payload.new
            
            // Send status update
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'status',
              status: update.status,
              progress: update.progress || 0,
              metadata: update.metadata
            })}\n\n`))

            // Send result if completed
            if (update.status === 'completed' && update.result) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'result',
                content: update.result.response,
                usage: update.result.usage,
                threadId: update.metadata?.thread_id
              })}\n\n`))
              
              // Close stream after sending result
              setTimeout(() => {
                controller.close()
                channel.unsubscribe()
              }, 1000)
            }

            // Handle errors
            if (update.status === 'failed') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                error: update.error || 'Processing failed'
              })}\n\n`))
              
              setTimeout(() => {
                controller.close()
                channel.unsubscribe()
              }, 1000)
            }
          }
        )
        .subscribe()

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':heartbeat\n\n'))
        } catch (e) {
          // Connection closed
          clearInterval(heartbeat)
          channel.unsubscribe()
        }
      }, 30000) // Every 30 seconds

      // Clean up on close
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        channel.unsubscribe()
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
})