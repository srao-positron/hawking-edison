import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SNSClient, PublishCommand } from "npm:@aws-sdk/client-sns@3"

serve(async (req) => {
  try {
    // Get all environment variables
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')
    const region = Deno.env.get('AWS_REGION') || 'us-east-2'
    const topicArn = Deno.env.get('AWS_SNS_TOPIC_ARN')
    
    const envCheck = {
      hasAccessKey: !!accessKeyId,
      hasSecretKey: !!secretAccessKey,
      region,
      topicArn,
      accessKeyPrefix: accessKeyId?.substring(0, 10) || 'none'
    }
    
    if (!accessKeyId || !secretAccessKey || !topicArn) {
      return new Response(JSON.stringify({ 
        error: 'Missing required environment variables',
        envCheck
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Try to publish a test message
    const testMessage = {
      sessionId: 'test-' + Date.now(),
      action: 'start',
      userId: 'test-user',
      input: 'Test message from debug function'
    }
    
    console.log('Creating SNS client with:', {
      region,
      topicArn,
      hasCredentials: true
    })
    
    const client = new SNSClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    })
    
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(testMessage),
      MessageAttributes: {
        action: {
          DataType: 'String',
          StringValue: 'start'
        }
      }
    })
    
    console.log('Sending SNS publish command...')
    const response = await client.send(command)
    console.log('SNS publish response:', response)
    
    return new Response(JSON.stringify({ 
      success: true,
      messageId: response.MessageId,
      envCheck,
      testMessage,
      response: {
        messageId: response.MessageId,
        requestId: response.$metadata.requestId,
        httpStatusCode: response.$metadata.httpStatusCode
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error in test-sns:', error)
    
    // Extract more detailed error information
    const errorDetails: any = {
      message: error.message,
      name: error.name,
      stack: error.stack
    }
    
    // AWS SDK errors have additional metadata
    if (error.$metadata) {
      errorDetails.metadata = error.$metadata
    }
    if (error.$fault) {
      errorDetails.fault = error.$fault
    }
    if (error.$service) {
      errorDetails.service = error.$service
    }
    
    return new Response(JSON.stringify({ 
      error: 'SNS publish failed',
      details: errorDetails
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})