import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Only allow service role for security
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.includes('service_role')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const envCheck = {
    AWS_ACCESS_KEY_ID: {
      exists: !!Deno.env.get('AWS_ACCESS_KEY_ID'),
      length: Deno.env.get('AWS_ACCESS_KEY_ID')?.length || 0,
      prefix: Deno.env.get('AWS_ACCESS_KEY_ID')?.substring(0, 6) || 'none'
    },
    AWS_SECRET_ACCESS_KEY: {
      exists: !!Deno.env.get('AWS_SECRET_ACCESS_KEY'),
      length: Deno.env.get('AWS_SECRET_ACCESS_KEY')?.length || 0
    },
    AWS_REGION: {
      exists: !!Deno.env.get('AWS_REGION'),
      value: Deno.env.get('AWS_REGION') || 'not set'
    },
    AWS_SNS_TOPIC_ARN: {
      exists: !!Deno.env.get('AWS_SNS_TOPIC_ARN'),
      value: Deno.env.get('AWS_SNS_TOPIC_ARN') || 'not set'
    },
    SUPABASE_URL: {
      exists: !!Deno.env.get('SUPABASE_URL'),
      value: Deno.env.get('SUPABASE_URL') || 'not set'
    }
  }
  
  return new Response(JSON.stringify(envCheck, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  })
})