// AWS SNS client for Edge Functions
import { SNSClient, PublishCommand } from "npm:@aws-sdk/client-sns@3"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SNSConfig {
  accessKeyId: string
  secretAccessKey: string
  region: string
  topicArn: string
}

// Cache config for the lifetime of the function instance
let cachedConfig: SNSConfig | null = null

// Get SNS configuration - credentials from env, topic ARN from database
export async function getSNSConfig(): Promise<SNSConfig | null> {
  // Return cached config if available
  if (cachedConfig) return cachedConfig

  // Get credentials from environment variables (stable IAM user)
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')
  const region = Deno.env.get('AWS_REGION') || 'us-east-2'
  
  if (!accessKeyId || !secretAccessKey) {
    console.error('AWS credentials not found in environment variables')
    return null
  }

  // Get topic ARN from database (updated by CDK)
  let topicArn = Deno.env.get('AWS_SNS_TOPIC_ARN') // Fallback
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      // Get topic ARN from database (CDK updates this)
      const { data, error } = await supabase.rpc('get_aws_credentials')
      
      if (!error && data && data.topicArn) {
        console.log('Retrieved topic ARN from database:', data.topicArn)
        topicArn = data.topicArn
      } else if (error) {
        console.warn('Failed to retrieve topic ARN from database:', error.message)
      }
    }
  } catch (error) {
    console.warn('Error accessing database for topic ARN:', error)
  }

  if (!topicArn) {
    console.error('No SNS topic ARN found')
    return null
  }

  console.log('Using AWS credentials from environment, topic ARN from database')
  cachedConfig = {
    accessKeyId,
    secretAccessKey,
    region,
    topicArn
  }
  
  return cachedConfig
}

// Publish message to SNS
export async function publishToSNS(message: any): Promise<boolean> {
  const config = await getSNSConfig()
  if (!config) {
    console.error('SNS not configured, skipping publish')
    return false
  }

  try {
    const client = new SNSClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })

    const command = new PublishCommand({
      TopicArn: config.topicArn,
      Message: JSON.stringify(message),
      MessageAttributes: {
        action: {
          DataType: 'String',
          StringValue: message.action || 'start'
        },
        userId: {
          DataType: 'String',
          StringValue: message.userId || 'unknown'
        }
      }
    })

    const response = await client.send(command)
    console.log('Published to SNS:', response.MessageId)
    return true
  } catch (error) {
    console.error('Failed to publish to SNS:', error)
    return false
  }
}

// Check if orchestration should be used based on the request
export function shouldUseOrchestration(input: string): boolean {
  // Patterns that indicate long-running operations
  const orchestrationPatterns = [
    /panel\s+discussion/i,
    /run\s+simulation/i,
    /multi[-\s]?round/i,
    /analyze\s+large\s+dataset/i,
    /complex\s+analysis/i,
    /extensive\s+research/i,
    /comprehensive\s+review/i
  ]

  return orchestrationPatterns.some(pattern => pattern.test(input))
}