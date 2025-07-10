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

// Get SNS configuration from Vault first, then fall back to environment
export async function getSNSConfig(): Promise<SNSConfig | null> {
  // Return cached config if available
  if (cachedConfig) return cachedConfig

  try {
    // Try to get credentials from Vault first
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      // Call the function to get AWS credentials
      const { data, error } = await supabase.rpc('get_aws_credentials')
      
      if (!error && data) {
        console.log('Retrieved AWS credentials from Vault')
        cachedConfig = {
          accessKeyId: data.accessKeyId,
          secretAccessKey: data.secretAccessKey,
          region: data.region,
          topicArn: data.topicArn
        }
        return cachedConfig
      } else if (error) {
        console.warn('Failed to retrieve credentials from Vault:', error.message)
      }
    }
  } catch (error) {
    console.warn('Error accessing Vault:', error)
  }

  // Fall back to environment variables
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')
  const region = Deno.env.get('AWS_REGION') || 'us-east-1'
  const topicArn = Deno.env.get('AWS_SNS_TOPIC_ARN')

  if (!accessKeyId || !secretAccessKey || !topicArn) {
    console.error('No AWS configuration found in Vault or environment')
    return null
  }

  console.log('Using AWS credentials from environment variables')
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