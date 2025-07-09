import { serve } from 'https://deno.land/std@0.177.1/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { authenticateRequest } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { ApiError, ErrorCodes } from '../_shared/errors.ts'
import { logger } from '../_shared/logger.ts'

// Import types (we'll copy them here since Edge Functions can't import from src)
interface Thread {
  id: string
  user_id: string
  name: string
  auto_generated_name: string | null
  parent_thread_id: string | null
  created_at: string
  updated_at: string
}

interface ThreadWithCounts extends Thread {
  messages?: { count: number }[]
  visualizations?: { count: number }[]
  agent_conversations?: { count: number }[]
}

interface CreateThreadInput {
  input?: string
  name?: string
}

interface UpdateThreadInput {
  name: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    const { user, supabase } = await authenticateRequest(req)
    const method = req.method
    const url = new URL(req.url)
    const threadId = url.pathname.split('/').pop()

    switch (method) {
      case 'GET': {
        // List threads or get specific thread
        if (threadId && threadId !== 'threads') {
          // Get specific thread
          const { data: thread, error } = await supabase
            .from('threads')
            .select(`
              *,
              messages(count),
              visualizations(count),
              agent_conversations(count)
            `)
            .eq('id', threadId)
            .eq('user_id', user.id)
            .single()

          if (error) {
            throw new ApiError(ErrorCodes.NOT_FOUND, 'Thread not found')
          }

          return new Response(
            JSON.stringify({ thread }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          )
        } else {
          // List all threads
          const { data: threads, error } = await supabase
            .from('threads')
            .select(`
              *,
              messages(count),
              visualizations(count),
              agent_conversations(count)
            `)
            .eq('user_id', user.id)
            .is('parent_thread_id', null) // Only root threads
            .order('updated_at', { ascending: false })

          if (error) {
            throw new ApiError(ErrorCodes.DATABASE_ERROR, error.message)
          }

          return new Response(
            JSON.stringify({ threads }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          )
        }
      }

      case 'POST': {
        // Create new thread
        const body: ThreadInput = await req.json()
        
        // Generate thread name from first input or use provided name
        let threadName = body.name || 'New Conversation'
        
        if (!body.name && body.input) {
          // Auto-generate name from input
          threadName = await generateThreadName(body.input)
        }

        const { data: thread, error } = await supabase
          .from('threads')
          .insert({
            user_id: user.id,
            name: threadName,
            auto_generated_name: !body.name ? threadName : null,
          })
          .select()
          .single()

        if (error) {
          throw new ApiError(ErrorCodes.DATABASE_ERROR, error.message)
        }

        logger.info('Thread created', { threadId: thread.id, userId: user.id })

        return new Response(
          JSON.stringify({ thread }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201,
          }
        )
      }

      case 'PATCH': {
        // Update thread (primarily for renaming)
        if (!threadId || threadId === 'threads') {
          throw new ApiError(ErrorCodes.VALIDATION_ERROR, 'Thread ID required')
        }

        const body = await req.json()
        
        if (!body.name) {
          throw new ApiError(ErrorCodes.VALIDATION_ERROR, 'Name is required')
        }

        // Verify ownership
        const { data: existing } = await supabase
          .from('threads')
          .select('id')
          .eq('id', threadId)
          .eq('user_id', user.id)
          .single()

        if (!existing) {
          throw new ApiError(ErrorCodes.NOT_FOUND, 'Thread not found')
        }

        const { error } = await supabase
          .from('threads')
          .update({ 
            name: body.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', threadId)
          .eq('user_id', user.id)

        if (error) {
          throw new ApiError(ErrorCodes.DATABASE_ERROR, error.message)
        }

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'DELETE': {
        // Delete thread (and all sub-threads)
        if (!threadId || threadId === 'threads') {
          throw new ApiError(ErrorCodes.VALIDATION_ERROR, 'Thread ID required')
        }

        // Verify ownership
        const { data: existing } = await supabase
          .from('threads')
          .select('id')
          .eq('id', threadId)
          .eq('user_id', user.id)
          .single()

        if (!existing) {
          throw new ApiError(ErrorCodes.NOT_FOUND, 'Thread not found')
        }

        // Delete will cascade to messages, sub-threads, etc due to foreign keys
        const { error } = await supabase
          .from('threads')
          .delete()
          .eq('id', threadId)
          .eq('user_id', user.id)

        if (error) {
          throw new ApiError(ErrorCodes.DATABASE_ERROR, error.message)
        }

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      default:
        throw new ApiError(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${method} not allowed`)
    }
  } catch (error) {
    logger.error('Thread operation failed', error)
    
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

// Helper function to generate thread name using LLM
async function generateThreadName(input: string): Promise<string> {
  try {
    // Use OpenAI for quick thread naming
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Generate a concise 3-5 word title for this conversation. Be specific and descriptive. Respond with ONLY the title, no quotes or punctuation.'
          },
          {
            role: 'user',
            content: input
          }
        ],
        max_tokens: 20,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate thread name')
    }

    const data = await response.json()
    const generatedName = data.choices[0]?.message?.content?.trim()
    
    // Fallback if generation fails
    if (!generatedName) {
      return input.length > 50 ? input.substring(0, 50) + '...' : input
    }

    return generatedName
  } catch (error) {
    logger.error('Failed to generate thread name', error)
    // Fallback to truncated input
    return input.length > 50 ? input.substring(0, 50) + '...' : input
  }
}