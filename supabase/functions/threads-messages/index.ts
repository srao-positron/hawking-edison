import { serve } from 'https://deno.land/std@0.177.1/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { authenticateRequest } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { ApiError, ErrorCodes } from '../_shared/errors.ts'
import { logger } from '../_shared/logger.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    const { user, supabase } = await authenticateRequest(req)
    
    // Extract threadId from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const threadId = pathParts[pathParts.length - 2] // /threads/{threadId}/messages

    if (!threadId || threadId === 'threads') {
      throw new ApiError(ErrorCodes.VALIDATION_ERROR, 'Thread ID is required')
    }

    // Verify thread ownership
    const { data: thread } = await supabase
      .from('threads')
      .select('id')
      .eq('id', threadId)
      .eq('user_id', user.id)
      .single()

    if (!thread) {
      throw new ApiError(ErrorCodes.NOT_FOUND, 'Thread not found')
    }

    // Get messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('Failed to get messages', error)
      throw new ApiError(ErrorCodes.DATABASE_ERROR, 'Failed to get messages')
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          messages: messages || []
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    logger.error('Get messages failed', error)
    
    if (error instanceof ApiError) {
      return new Response(
        JSON.stringify({ error: error.message, code: error.code }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: error.statusCode,
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error', code: ErrorCodes.INTERNAL_ERROR }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})