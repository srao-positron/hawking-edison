import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-service-key',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify service key authentication
    const serviceKey = req.headers.get('x-service-key')
    const expectedServiceKey = Deno.env.get('VAULT_STORE_SERVICE_KEY')
    
    if (!serviceKey || serviceKey !== expectedServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse the request body
    const { accessKeyId, secretAccessKey, region, topicArn } = await req.json()

    if (!accessKeyId || !secretAccessKey || !region || !topicArn) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Store credentials in Vault
    console.log('Storing AWS credentials in Vault...')
    const { error } = await supabase.rpc('store_aws_credentials', {
      p_access_key_id: accessKeyId,
      p_secret_access_key: secretAccessKey,
      p_region: region,
      p_topic_arn: topicArn
    })

    if (error) {
      console.error('Failed to store credentials:', error)
      return new Response(
        JSON.stringify({ error: `Failed to store credentials: ${error.message}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Successfully stored AWS credentials in Vault')

    // Verify storage
    const { data: verifyData, error: verifyError } = await supabase.rpc('get_aws_credentials')
    
    if (verifyError) {
      console.warn('Could not verify credentials:', verifyError.message)
    } else if (verifyData) {
      console.log('Credentials verified successfully')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Credentials stored in Vault',
        verified: !!verifyData 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in vault-store function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})