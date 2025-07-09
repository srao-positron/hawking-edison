// AWS SNS client for Edge Functions
import { SNSClient, PublishCommand } from "npm:@aws-sdk/client-sns@3"

interface SNSConfig {
  accessKeyId: string
  secretAccessKey: string
  region: string
  topicArn: string
}

// Get SNS configuration from environment
export function getSNSConfig(): SNSConfig | null {
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')
  const region = Deno.env.get('AWS_REGION') || 'us-east-1'
  const topicArn = Deno.env.get('AWS_SNS_TOPIC_ARN')

  if (!accessKeyId || !secretAccessKey || !topicArn) {
    console.error('Missing required AWS configuration')
    return null
  }

  return {
    accessKeyId,
    secretAccessKey,
    region,
    topicArn
  }
}

// Publish message to SNS
export async function publishToSNS(message: any): Promise<boolean> {
  const config = getSNSConfig()
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