// Debug Edge Function for SNS connectivity
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SNSClient, PublishCommand } from "npm:@aws-sdk/client-sns@3"
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const debug = {
    hasCredentials: false,
    credentialsSource: '',
    snsClientCreated: false,
    publishAttempted: false,
    publishSuccess: false,
    error: null as string | null,
    messageId: null as string | null,
    awsConfig: null as any,
    rpcResult: null as any,
    envVars: {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasSupabaseKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasAwsAccessKey: !!Deno.env.get('AWS_ACCESS_KEY_ID'),
      hasAwsSecretKey: !!Deno.env.get('AWS_SECRET_ACCESS_KEY'),
      hasAwsRegion: !!Deno.env.get('AWS_REGION'),
      hasSnsTopic: !!Deno.env.get('AWS_SNS_TOPIC_ARN')
    }
  }

  try {
    // Step 1: Get credentials from environment variables
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')
    const region = Deno.env.get('AWS_REGION') || 'us-east-2'
    
    if (!accessKeyId || !secretAccessKey) {
      debug.error = 'AWS credentials not found in environment variables'
    } else {
    
    debug.hasCredentials = true
    debug.credentialsSource = 'environment'
    
    // Step 2: Get topic ARN from database
    let topicArn = Deno.env.get('AWS_SNS_TOPIC_ARN') // Fallback
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      try {
        const { data, error } = await supabase.rpc('get_aws_credentials')
        debug.rpcResult = { data, error }
        
        if (!error && data && data.topicArn) {
          topicArn = data.topicArn
          console.log('Got topic ARN from database:', topicArn)
        }
      } catch (rpcError) {
        console.warn('Error getting topic ARN from database:', rpcError)
      }
    }
    
    if (!topicArn) {
      debug.error = 'No SNS topic ARN found'
    } else {
    
    debug.awsConfig = {
      accessKeyId,
      secretAccessKey: '***hidden***',
      region,
      topicArn
    }
    
    // Step 3: Create SNS client with env credentials
    try {
      const client = new SNSClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      })
      debug.snsClientCreated = true
      
      // Step 4: Try to publish
      debug.publishAttempted = true
      const command = new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          source: 'debug-sns-function'
        }),
        MessageAttributes: {
          action: {
            DataType: 'String',
            StringValue: 'debug-test'
          }
        }
      })
      
      const response = await client.send(command)
      debug.publishSuccess = true
      debug.messageId = response.MessageId || null
    } catch (snsError) {
      debug.error = `SNS Error: ${snsError.message || snsError}`
    }
    } // Close else block for topicArn check
    } // Close else block for credentials check
  } catch (error) {
    debug.error = `Unexpected error: ${error.message || error}`
  }

  return new Response(
    JSON.stringify(debug, null, 2),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  )
})