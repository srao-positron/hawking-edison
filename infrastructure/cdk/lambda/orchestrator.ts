import { SQSHandler, SQSEvent } from 'aws-lambda'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { DynamoDBClient, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb'
import { createClient } from '@supabase/supabase-js'

const sns = new SNSClient({ region: process.env.AWS_REGION })
const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION })
const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION })

interface OrchestrationEvent {
  sessionId: string
  action: 'start' | 'resume'
  userId: string
  input?: string
}

interface Session {
  id: string
  user_id: string
  status: string
  messages: any[]
  tool_state: any
  execution_count: number
  created_at: string
  updated_at: string
  started_at?: string
  final_response?: string
  error?: string
}

interface ToolCall {
  id: string
  name: string
  arguments: any
}

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  toolCalls?: ToolCall[]
  toolCallId?: string
}

// Get Supabase credentials from Secrets Manager
async function getSupabaseCredentials(): Promise<{ url: string; serviceRoleKey: string }> {
  const command = new GetSecretValueCommand({
    SecretId: 'hawking-edison/api-keys'
  })
  
  const response = await secretsManager.send(command)
  const secrets = JSON.parse(response.SecretString || '{}')
  
  return {
    url: secrets.SUPABASE_URL,
    serviceRoleKey: secrets.SUPABASE_SERVICE_ROLE_KEY
  }
}

// Track active session in DynamoDB
async function trackActiveSession(sessionId: string, userId: string) {
  const ttl = Math.floor(Date.now() / 1000) + 3600 // 1 hour TTL
  
  const command = new PutItemCommand({
    TableName: process.env.ACTIVE_SESSIONS_TABLE,
    Item: {
      sessionId: { S: sessionId },
      userId: { S: userId },
      startTime: { N: String(Date.now()) },
      ttl: { N: String(ttl) }
    }
  })
  
  await dynamodb.send(command)
}

// Remove active session from DynamoDB
async function removeActiveSession(sessionId: string) {
  const command = new DeleteItemCommand({
    TableName: process.env.ACTIVE_SESSIONS_TABLE,
    Key: {
      sessionId: { S: sessionId }
    }
  })
  
  await dynamodb.send(command)
}

// Load or create orchestration session
async function loadSession(supabase: any, sessionId: string): Promise<Session> {
  const { data, error } = await supabase
    .from('orchestration_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  
  if (error) {
    throw new Error(`Failed to load session: ${error.message}`)
  }
  
  return data
}

// Update session in database
async function updateSession(supabase: any, sessionId: string, updates: Partial<Session>) {
  const { error } = await supabase
    .from('orchestration_sessions')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)
  
  if (error) {
    throw new Error(`Failed to update session: ${error.message}`)
  }
}

// Save session state
async function saveSession(supabase: any, session: Session) {
  await updateSession(supabase, session.id, {
    messages: session.messages,
    tool_state: session.tool_state
  })
}

// Complete session with final response
async function completeSession(supabase: any, session: Session, response: string) {
  await updateSession(supabase, session.id, {
    status: 'completed',
    completed_at: new Date().toISOString()
  } as any)
  
  // Update final_response separately since it's not in the Session interface
  const { error } = await supabase
    .from('orchestration_sessions')
    .update({ final_response: response })
    .eq('id', session.id)
  
  if (error) {
    throw new Error(`Failed to update final response: ${error.message}`)
  }
  
  // Remove from active sessions
  await removeActiveSession(session.id)
}

// Handle timeout by queueing resumption
async function handleTimeout(supabase: any, session: Session) {
  console.log(`Session ${session.id} approaching timeout, saving state for resumption`)
  
  await updateSession(supabase, session.id, {
    status: 'resuming',
    messages: session.messages,
    tool_state: session.tool_state
  })
  
  // Queue resumption message
  const command = new PublishCommand({
    TopicArn: process.env.ORCHESTRATION_TOPIC_ARN,
    Message: JSON.stringify({
      sessionId: session.id,
      action: 'resume',
      userId: session.user_id
    })
  })
  
  await sns.send(command)
}

// Handle errors
async function handleError(supabase: any, sessionId: string, error: any) {
  console.error(`Error in orchestration for session ${sessionId}:`, error)
  
  const { error: updateError } = await supabase
    .from('orchestration_sessions')
    .update({
      status: 'failed',
      error: error.message || 'Unknown error',
      error_count: 1, // This would need to be incremented from current value
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)
  
  if (updateError) {
    console.error('Failed to update error status:', updateError)
  }
  
  // Remove from active sessions on error
  await removeActiveSession(sessionId)
}

// Placeholder for LLM calls with tools
async function callLLMWithTools(messages: Message[]): Promise<{ content?: string; toolCalls?: ToolCall[] }> {
  // TODO: Implement actual LLM call with function calling
  // This will use the LLM abstraction from Edge Functions
  console.log('LLM call with messages:', messages.length)
  
  // For now, return a completion to avoid infinite loop
  return { content: 'Orchestration system is being implemented. Tools coming soon!' }
}

// Execute tool with timeout handling
async function executeToolWithTimeout(
  toolCall: ToolCall, 
  remainingTime: number,
  context: { sessionId: string; supabase: any; shouldYield: () => boolean }
): Promise<string> {
  // TODO: Implement actual tool execution
  console.log(`Executing tool ${toolCall.name} with ${remainingTime}ms remaining`)
  
  // Placeholder result
  return JSON.stringify({ 
    status: 'completed',
    result: `Tool ${toolCall.name} executed successfully` 
  })
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  const startTime = Date.now()
  const TIMEOUT_BUFFER = 60000 // 1 minute before Lambda timeout
  const MAX_EXECUTION_TIME = 14 * 60 * 1000 // 14 minutes
  
  // Get Supabase credentials
  const { url, serviceRoleKey } = await getSupabaseCredentials()
  const supabase = createClient(url, serviceRoleKey)
  
  for (const record of event.Records) {
    const message: OrchestrationEvent = JSON.parse(record.body)
    console.log('Processing orchestration event:', message)
    
    try {
      // Load session
      const session = await loadSession(supabase, message.sessionId)
      
      // Track this as an active session
      await trackActiveSession(session.id, session.user_id)
      
      // Update status to running
      await updateSession(supabase, session.id, { 
        status: 'running',
        execution_count: session.execution_count + 1
      })
      
      // Update started_at if not already set
      if (!session.started_at) {
        await supabase
          .from('orchestration_sessions')
          .update({ started_at: new Date().toISOString() })
          .eq('id', session.id)
      }
      
      // Main orchestration loop
      while (true) {
        // Check if approaching timeout
        const elapsedTime = Date.now() - startTime
        if (elapsedTime > MAX_EXECUTION_TIME - TIMEOUT_BUFFER) {
          await handleTimeout(supabase, session)
          return
        }
        
        // Create context for tool execution
        const context = {
          sessionId: session.id,
          supabase,
          shouldYield: () => (Date.now() - startTime) > MAX_EXECUTION_TIME - TIMEOUT_BUFFER
        }
        
        // Get next LLM action
        const response = await callLLMWithTools(session.messages)
        
        if (response.toolCalls && response.toolCalls.length > 0) {
          // Execute tools
          for (const toolCall of response.toolCalls) {
            const remainingTime = MAX_EXECUTION_TIME - (Date.now() - startTime)
            const result = await executeToolWithTimeout(toolCall, remainingTime, context)
            
            // Add to conversation
            session.messages.push({
              role: 'assistant',
              content: null,
              toolCalls: [toolCall]
            })
            session.messages.push({
              role: 'tool',
              toolCallId: toolCall.id,
              content: result
            })
            
            // Save progress after each tool
            await saveSession(supabase, session)
            
            // Check if we should yield after tool execution
            if (context.shouldYield()) {
              await handleTimeout(supabase, session)
              return
            }
          }
        } else if (response.content) {
          // LLM is done - save final response
          session.messages.push({
            role: 'assistant',
            content: response.content
          })
          await completeSession(supabase, session, response.content)
          console.log(`Session ${session.id} completed successfully`)
          return
        } else {
          // No response from LLM
          throw new Error('No response from LLM')
        }
      }
    } catch (error) {
      await handleError(supabase, message.sessionId, error)
    }
  }
}