import { SQSEvent, SQSRecord } from 'aws-lambda'
import { SecretsManager } from '@aws-sdk/client-secrets-manager'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

// Initialize AWS Secrets Manager
const secretsManager = new SecretsManager({ region: process.env.AWS_REGION })

// Cache for secrets
let cachedSecrets: any = null
let secretsExpiry = 0

// Task types
type TaskType = 'simulation' | 'panel' | 'discussion' | 'analysis'

interface Task {
  id: string
  userId: string
  type: TaskType
  config: any
  createdAt: string
}

interface TaskResult {
  success: boolean
  data?: any
  error?: string
}

// Get secrets from AWS Secrets Manager
async function getSecrets() {
  const now = Date.now()
  if (cachedSecrets && now < secretsExpiry) {
    return cachedSecrets
  }

  try {
    const response = await secretsManager.getSecretValue({
      SecretId: process.env.SECRETS_ARN!,
    })

    cachedSecrets = JSON.parse(response.SecretString!)
    secretsExpiry = now + 300000 // Cache for 5 minutes
    return cachedSecrets
  } catch (error) {
    console.error('Failed to get secrets:', error)
    throw error
  }
}

// Initialize clients
async function initializeClients() {
  const secrets = await getSecrets()

  const supabase = createClient(
    secrets.SUPABASE_URL,
    secrets.SUPABASE_SERVICE_ROLE_KEY
  )

  const anthropic = new Anthropic({
    apiKey: secrets.ANTHROPIC_API_KEY,
  })

  const openai = new OpenAI({
    apiKey: secrets.OPENAI_API_KEY,
  })

  return { supabase, anthropic, openai }
}

// Process a single task
async function processTask(task: Task): Promise<TaskResult> {
  const { supabase, anthropic, openai } = await initializeClients()

  try {
    // Update task status to processing
    await supabase
      .from('tasks')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    let result: any

    switch (task.type) {
      case 'simulation':
        result = await runSimulation(task, anthropic, supabase)
        break
      case 'panel':
        result = await runPanel(task, anthropic, supabase)
        break
      case 'discussion':
        result = await runDiscussion(task, anthropic, supabase)
        break
      case 'analysis':
        result = await runAnalysis(task, anthropic, openai, supabase)
        break
      default:
        throw new Error(`Unknown task type: ${task.type}`)
    }

    // Update task with results
    await supabase
      .from('tasks')
      .update({
        status: 'completed',
        result,
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    return { success: true, data: result }
  } catch (error) {
    console.error(`Task ${task.id} failed:`, error)

    // Update task status to failed
    await supabase
      .from('tasks')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        failed_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Simulation logic
async function runSimulation(
  task: Task,
  anthropic: Anthropic,
  supabase: any
): Promise<any> {
  const { agents, topic, rounds } = task.config

  const results = []

  for (let round = 0; round < rounds; round++) {
    // Update progress
    await supabase
      .from('tasks')
      .update({
        progress: (round + 1) / rounds,
        current_round: round + 1,
      })
      .eq('id', task.id)

    // Run simulation round
    const roundResult = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Simulate round ${round + 1} of a ${topic} scenario with ${agents} agents.`,
        },
      ],
    })

    results.push({
      round: round + 1,
      content: (roundResult.content[0] as any).text || '',
    })
  }

  return { results, totalRounds: rounds }
}

// Panel discussion logic
async function runPanel(
  task: Task,
  anthropic: Anthropic,
  supabase: any
): Promise<any> {
  const { panelists, topic, duration } = task.config

  // Create panel discussion
  const discussion = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `Create a panel discussion on "${topic}" with these panelists: ${panelists.join(
          ', '
        )}. Duration: ${duration} minutes.`,
      },
    ],
  })

  return {
    topic,
    panelists,
    discussion: (discussion.content[0] as any).text || '',
    duration,
  }
}

// Discussion logic
async function runDiscussion(
  task: Task,
  anthropic: Anthropic,
  supabase: any
): Promise<any> {
  const { participants, topic, style } = task.config

  const discussion = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: `Create a ${style} discussion about "${topic}" between: ${participants.join(
          ', '
        )}`,
      },
    ],
  })

  return {
    topic,
    participants,
    style,
    content: (discussion.content[0] as any).text || '',
  }
}

// Analysis logic (can use either Anthropic or OpenAI)
async function runAnalysis(
  task: Task,
  anthropic: Anthropic,
  openai: OpenAI,
  supabase: any
): Promise<any> {
  const { data, analysisType, provider = 'anthropic' } = task.config

  let result

  if (provider === 'openai') {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'user',
          content: `Perform a ${analysisType} analysis on: ${JSON.stringify(
            data
          )}`,
        },
      ],
    })

    result = completion.choices[0].message.content
  } else {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: `Perform a ${analysisType} analysis on: ${JSON.stringify(
            data
          )}`,
        },
      ],
    })

    result = (response.content[0] as any).text || ''
  }

  return {
    analysisType,
    provider,
    result,
  }
}

// Lambda handler
export async function handler(event: SQSEvent) {
  const results = []

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body)
      
      // Handle SNS message format
      const task = message.Message ? JSON.parse(message.Message) : message
      
      console.log(`Processing task ${task.id} of type ${task.type}`)
      
      const result = await processTask(task)
      results.push({ messageId: record.messageId, ...result })
    } catch (error) {
      console.error('Failed to process record:', error)
      results.push({
        messageId: record.messageId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      // Don't throw - let SQS retry mechanism handle it
    }
  }

  // Return batch item failures for partial batch failure handling
  const failures = results
    .filter((r) => !r.success)
    .map((r) => ({ itemIdentifier: r.messageId }))

  return {
    batchItemFailures: failures,
  }
}