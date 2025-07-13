// AWS SNS client for Edge Functions
import { SNSClient, PublishCommand } from "npm:@aws-sdk/client-sns@3"

interface SNSConfig {
  accessKeyId: string
  secretAccessKey: string
  region: string
  topicArn: string
}

// Cache config for the lifetime of the function instance
let cachedConfig: SNSConfig | null = null

// Get SNS configuration from environment variables
export async function getSNSConfig(): Promise<SNSConfig | null> {
  // Return cached config if available
  if (cachedConfig) return cachedConfig

  // Get all config from environment variables
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')
  const region = Deno.env.get('AWS_REGION') || 'us-east-2'
  const topicArn = Deno.env.get('AWS_SNS_TOPIC_ARN')
  
  console.log('Getting SNS config from environment:', {
    hasAccessKey: !!accessKeyId,
    hasSecretKey: !!secretAccessKey,
    region,
    topicArn
  })
  
  if (!accessKeyId || !secretAccessKey || !topicArn) {
    console.error('Missing required AWS environment variables')
    return null
  }

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
  console.log('[SNS] publishToSNS called with message:', JSON.stringify(message))
  
  const config = await getSNSConfig()
  console.log('[SNS] getSNSConfig returned:', config ? 'config found' : 'no config')
  
  if (!config) {
    console.error('[SNS] SNS not configured, skipping publish')
    return false
  }

  console.log('[SNS] Config details:', {
    hasAccessKey: !!config.accessKeyId,
    hasSecretKey: !!config.secretAccessKey,
    region: config.region,
    topicArn: config.topicArn
  })

  try {
    console.log('[SNS] Creating SNS client...')
    const client = new SNSClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })

    console.log('[SNS] Creating PublishCommand...')
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

    console.log('[SNS] Sending command to SNS...')
    const response = await client.send(command)
    console.log('[SNS] Successfully published to SNS! MessageId:', response.MessageId)
    return true
  } catch (error) {
    console.error('[SNS] Failed to publish to SNS:', error)
    console.error('[SNS] Error details:', JSON.stringify(error, null, 2))
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