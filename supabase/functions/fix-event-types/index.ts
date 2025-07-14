import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Execute the ALTER TABLE command
    const { data, error } = await supabaseAdmin.rpc('query', {
      query_text: `
        -- Drop existing constraint
        ALTER TABLE orchestration_events DROP CONSTRAINT IF EXISTS orchestration_events_event_type_check;
        
        -- Add new constraint with all event types
        ALTER TABLE orchestration_events 
        ADD CONSTRAINT orchestration_events_event_type_check 
        CHECK (event_type IN (
          'tool_call',
          'tool_result',
          'verification',
          'retry',
          'thinking',
          'status_update',
          'error',
          'context_compression',
          'agent_created',
          'agent_thought',
          'discussion_turn'
        ));
      `
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Event types constraint updated successfully',
        data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error updating event types:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})