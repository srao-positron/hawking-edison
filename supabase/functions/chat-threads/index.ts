import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ChatThread {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
  message_count: number
  last_message_at: string | null
  metadata: Record<string, any>
}

interface CreateThreadRequest {
  title?: string
  metadata?: Record<string, any>
}

interface UpdateThreadRequest {
  title?: string
  metadata?: Record<string, any>
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const threadId = url.pathname.split('/').pop()

    switch (req.method) {
      case 'GET': {
        if (threadId && threadId !== 'chat-threads') {
          // Get single thread with messages
          const { data: thread, error: threadError } = await supabase
            .from('chat_threads')
            .select('*')
            .eq('id', threadId)
            .eq('user_id', user.id)
            .single()

          if (threadError) {
            return new Response(
              JSON.stringify({ error: threadError.message }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          // Get messages for the thread
          const { data: messages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true })

          if (messagesError) {
            return new Response(
              JSON.stringify({ error: messagesError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              data: { thread, messages } 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          // List all threads for user
          const limit = parseInt(url.searchParams.get('limit') || '50')
          const offset = parseInt(url.searchParams.get('offset') || '0')

          const { data: threads, error, count } = await supabase
            .from('chat_threads')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1)

          if (error) {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              data: { threads, total: count } 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      case 'POST': {
        const body: CreateThreadRequest = await req.json()
        
        const { data: thread, error } = await supabase
          .from('chat_threads')
          .insert({
            user_id: user.id,
            title: body.title || null,
            metadata: body.metadata || {}
          })
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, data: { thread } }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'PUT': {
        if (!threadId || threadId === 'chat-threads') {
          return new Response(
            JSON.stringify({ error: 'Thread ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const body: UpdateThreadRequest = await req.json()
        
        const { data: thread, error } = await supabase
          .from('chat_threads')
          .update({
            title: body.title,
            metadata: body.metadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', threadId)
          .eq('user_id', user.id)
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, data: { thread } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'DELETE': {
        if (!threadId || threadId === 'chat-threads') {
          return new Response(
            JSON.stringify({ error: 'Thread ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .from('chat_threads')
          .delete()
          .eq('id', threadId)
          .eq('user_id', user.id)

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Error in chat-threads function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})