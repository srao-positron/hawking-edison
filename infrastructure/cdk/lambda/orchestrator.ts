import { SQSHandler, SQSEvent } from 'aws-lambda'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { DynamoDBClient, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb'
import { createClient } from '@supabase/supabase-js'
import { callLLMWithTools, LLMMessage } from './llm-client'
import { getToolDefinitions, executeTool, ToolExecutionContext } from './tools'
import { verify } from './tools/verification'
import { generateHumanId } from './human-id'
import { MCPProxy } from './mcp-proxy'
import { setAgentContext } from './tools/agent'

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
  // Check if this session is part of an existing thread
  const existingThreadId = session.tool_state?.thread_id
  console.log(`Completing session ${session.id}, existing thread: ${existingThreadId}`)
  
  let threadId = existingThreadId
  let isNewThread = false
  
  // Only create a new thread if we don't have an existing one
  if (!existingThreadId) {
    // Create a chat thread for the completed session
    const userInput = session.messages.find(m => m.role === 'user')?.content || 'Untitled conversation'
    const threadTitle = userInput.length > 50 ? userInput.substring(0, 47) + '...' : userInput
    
    // Generate a human-readable thread ID using the same function as Edge Functions
    threadId = generateHumanId()
    isNewThread = true
    
    // Create the thread
    const { data: thread, error: threadError } = await supabase
      .from('chat_threads')
      .insert({
        id: threadId,
        user_id: session.user_id,
        title: threadTitle,
        metadata: {
          orchestration_session_id: session.id,
          created_from: 'orchestrator'
        }
      })
      .select()
      .single()
    
    if (threadError) {
      console.error('Failed to create chat thread:', threadError)
      threadId = null
    }
  }
  
  if (threadId) {
    // Create chat messages for the conversation
    const messages = []
    
    // For existing threads, only add the latest user message and assistant response
    // For new threads, add all messages (excluding system messages)
    if (isNewThread) {
      // Add all user messages for new thread (excluding system messages)
      const userMessages = session.messages.filter(m => m.role === 'user' && !m.content?.startsWith('Verification failed'))
      userMessages.forEach((msg, index) => {
        messages.push({
          thread_id: threadId,
          user_id: session.user_id,
          role: 'user',
          content: msg.content,
          created_at: new Date(Date.parse(session.created_at) + index * 1000).toISOString()
        })
      })
    } else {
      // For existing thread, DO NOT add user messages - Edge Function already saved them
      // Only the assistant response will be added below
    }
    
    // Always add the assistant response
    try {
      const finalResponseData = JSON.parse(response)
      messages.push({
        thread_id: threadId,
        user_id: session.user_id,
        role: 'assistant',
        content: finalResponseData.content || response,
        metadata: { orchestration_session_id: session.id },
        created_at: new Date().toISOString()
      })
    } catch (e) {
      // If parsing fails, use the raw response
      messages.push({
        thread_id: threadId,
        user_id: session.user_id,
        role: 'assistant',
        content: response,
        metadata: { orchestration_session_id: session.id },
        created_at: new Date().toISOString()
      })
    }
    
    // Insert messages
    if (messages.length > 0) {
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .insert(messages)
      
      if (messagesError) {
        console.error('Failed to create chat messages:', messagesError)
      } else {
        // Get current message count first
        const { data: thread, error: getError } = await supabase
          .from('chat_threads')
          .select('message_count')
          .eq('id', threadId)
          .single()
        
        if (!getError && thread) {
          // Update thread metadata: message count and last message timestamp
          const { error: threadUpdateError } = await supabase
            .from('chat_threads')
            .update({
              message_count: (thread.message_count || 0) + messages.length,
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', threadId)
          
          if (threadUpdateError) {
            console.error('Failed to update thread metadata:', threadUpdateError)
          }
        }
      }
    }
    
    // Update session with thread_id in the tool_state (which stores metadata)
    const currentToolState = session.tool_state || {}
    const { error: metadataError } = await supabase
      .from('orchestration_sessions')
      .update({ 
        tool_state: { 
          ...currentToolState,
          thread_id: threadId 
        } 
      })
      .eq('id', session.id)
    
    if (metadataError) {
      console.error('Failed to update session tool_state:', metadataError)
    }
  }
  
  await updateSession(supabase, session.id, {
    status: 'completed',
    completed_at: new Date().toISOString()
  } as any)
  
  // Update final_response with threadId included
  let finalResponseWithThread = response
  try {
    const responseData = JSON.parse(response)
    responseData.threadId = threadId
    finalResponseWithThread = JSON.stringify(responseData)
  } catch (e) {
    // If response is not JSON, wrap it
    finalResponseWithThread = JSON.stringify({
      content: response,
      threadId: threadId
    })
  }
  
  const { error } = await supabase
    .from('orchestration_sessions')
    .update({ final_response: finalResponseWithThread })
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
  
  // Log error event
  try {
    await supabase.rpc('log_orchestration_event', {
      p_session_id: sessionId,
      p_event_type: 'error',
      p_event_data: {
        error: error.message || 'Unknown error',
        stack: error.stack || '',
        timestamp: new Date().toISOString()
      }
    })
  } catch (logError) {
    console.error('Failed to log error event:', logError)
  }
  
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


// Execute tool with timeout handling and verification
async function executeToolWithTimeout(
  toolCall: ToolCall, 
  remainingTime: number,
  context: { sessionId: string; supabase: any; shouldYield: () => boolean; userId: string; threadId?: string }
): Promise<string> {
  console.log(`Executing tool ${toolCall.name} with ${remainingTime}ms remaining`)
  
  try {
    let result: any
    
    // Check if this is an MCP tool
    if (toolCall.name.startsWith('mcp_')) {
      // Execute via MCP proxy
      const mcpProxy = new MCPProxy(context.supabase, context.sessionId, context.threadId)
      const originalToolName = toolCall.name.substring(4) // Remove 'mcp_' prefix
      result = await mcpProxy.executeTool(context.userId, originalToolName, toolCall.arguments)
    } else {
      // Create tool execution context for regular tools
      const toolContext: ToolExecutionContext = {
        supabase: context.supabase,
        userId: context.userId,
        sessionId: context.sessionId
      }
      
      // Execute the regular tool
      result = await executeTool(toolCall.name, toolCall.arguments, toolContext)
    }
    
    // Verify the tool execution achieved its goal
    const toolGoal = `Execute ${toolCall.name} with arguments: ${JSON.stringify(toolCall.arguments)}`
    const verification = await verify(result, toolGoal, 'agent')
    
    // Include verification in result
    return JSON.stringify({
      status: 'completed',
      result,
      verification
    })
  } catch (error) {
    console.error(`Error executing tool ${toolCall.name}:`, error)
    return JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      tool: toolCall.name
    })
  }
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  const startTime = Date.now()
  const TIMEOUT_BUFFER = 60000 // 1 minute before Lambda timeout
  const MAX_EXECUTION_TIME = 14 * 60 * 1000 // 14 minutes
  
  // Get Supabase credentials
  const { url, serviceRoleKey } = await getSupabaseCredentials()
  const supabase = createClient(url, serviceRoleKey)
  
  for (const record of event.Records) {
    // Parse SNS message from SQS record
    const snsMessage = JSON.parse(record.body) as any
    console.log('Raw SQS message:', snsMessage)
    
    // Extract the actual message from SNS notification
    let message: OrchestrationEvent
    if (snsMessage.Type === 'Notification' && snsMessage.Message) {
      // This is an SNS notification, parse the inner message
      message = JSON.parse(snsMessage.Message) as OrchestrationEvent
      console.log('Extracted message from SNS:', message)
    } else {
      // Direct message (for testing)
      message = snsMessage as OrchestrationEvent
    }
    
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
      
      // Log status update event
      await supabase.rpc('log_orchestration_event', {
        p_session_id: session.id,
        p_event_type: 'status_update',
        p_event_data: {
          from: 'pending',
          to: 'running',
          message: 'Starting orchestration...',
          execution_count: session.execution_count + 1
        }
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
          shouldYield: () => (Date.now() - startTime) > MAX_EXECUTION_TIME - TIMEOUT_BUFFER,
          userId: session.user_id,
          threadId: threadId
        }
        
        // Get available tools
        const baseTools = getToolDefinitions()
        
        // Get MCP tools for this user
        const mcpProxy = new MCPProxy(supabase, session.id, threadId)
        const mcpTools = await mcpProxy.getAvailableTools(session.user_id)
        const mcpToolsFormatted = MCPProxy.formatToolsForRegistry(mcpTools)
        
        // Combine base tools with MCP tools
        const tools = {
          ...baseTools,
          ...mcpToolsFormatted
        }
        
        console.log(`Available tools: ${Object.keys(baseTools).length} base, ${Object.keys(mcpToolsFormatted).length} MCP`)
        
        // Set agent context so all agents have access to tools
        setAgentContext(context, tools)
        
        // Check if we need to handle message compaction
        const needsCompression = session.tool_state?.needs_compression || false
        let messagesToSend = session.messages
        
        if (needsCompression) {
          console.log('Message compression needed, implementing compaction strategy')
          
          // Keep system message, first user message for context, and recent messages
          const systemMsg = session.messages.find(m => m.role === 'system')
          const firstUserMsg = session.messages.find(m => m.role === 'user')
          const recentMessages = session.messages.slice(-10) // Keep last 10 messages
          
          // Create a summary of older messages
          const oldMessages = session.messages.slice(1, -10) // Skip system, keep middle messages
          const summary = oldMessages.length > 0 ? `Previous conversation summary: The user and assistant have been discussing various topics. Key points covered include tool usage and responses.` : ''
          
          messagesToSend = []
          if (systemMsg) messagesToSend.push(systemMsg)
          if (firstUserMsg && !recentMessages.includes(firstUserMsg)) {
            messagesToSend.push(firstUserMsg)
          }
          if (summary) {
            messagesToSend.push({
              role: 'system',
              content: summary
            })
          }
          messagesToSend.push(...recentMessages)
          
          console.log(`Compressed ${session.messages.length} messages to ${messagesToSend.length}`)
          
          // Log context compression event
          await supabase.rpc('log_orchestration_event', {
            p_session_id: session.id,
            p_event_type: 'context_compression',
            p_event_data: {
              original_message_count: session.messages.length,
              compressed_message_count: messagesToSend.length,
              total_tokens_before: session.tool_state?.total_tokens || 0,
              messages_kept: {
                system: !!systemMsg,
                first_user: !!firstUserMsg && !recentMessages.includes(firstUserMsg),
                recent: recentMessages.length,
                summary_added: !!summary
              }
            }
          })
        }
        
        // Create system message for orchestration
        const systemMessage: LLMMessage = {
          role: 'system',
          content: `You are an orchestrator helping the user with their request.
          
          You have access to tools for:
          - Creating agents with any persona
          - Running discussions and interactions
          - Analyzing responses and finding consensus
          - Managing agent memory
          
          Use tools as needed to accomplish the user's goal.
          Be creative in how you combine tools.
          Verify your work achieves the intended outcome.`
        }
        
        // Add system message if not present
        if (!messagesToSend.find(m => m.role === 'system' && m.content?.includes('orchestrator'))) {
          messagesToSend.unshift(systemMessage)
        }
        
        // Get next LLM action
        console.log('=== ORCHESTRATOR CALLING LLM ===')
        console.log('Session messages:', session.messages.length)
        console.log('Messages to send:', messagesToSend.length)
        console.log('Last 3 messages:')
        messagesToSend.slice(-3).forEach((msg, i) => {
          console.log(`  ${i}: ${msg.role} - ${msg.content ? msg.content.substring(0, 100) : 'tool calls'}`);
        })
        
        const response = await callLLMWithTools(messagesToSend, tools)
        
        if (response.toolCalls && response.toolCalls.length > 0) {
          // Execute tools
          for (const toolCall of response.toolCalls) {
            // Log tool call event
            await supabase.rpc('log_orchestration_event', {
              p_session_id: session.id,
              p_event_type: 'tool_call',
              p_event_data: {
                tool: toolCall.name,
                arguments: toolCall.arguments,
                tool_call_id: toolCall.id,
                timestamp: new Date().toISOString()
              }
            })
            
            const remainingTime = MAX_EXECUTION_TIME - (Date.now() - startTime)
            const startToolTime = Date.now()
            const result = await executeToolWithTimeout(toolCall, remainingTime, context)
            const toolDuration = Date.now() - startToolTime
            
            // Log tool result event
            try {
              const resultData = JSON.parse(result)
              await supabase.rpc('log_orchestration_event', {
                p_session_id: session.id,
                p_event_type: 'tool_result',
                p_event_data: {
                  tool: toolCall.name,
                  tool_call_id: toolCall.id,
                  success: resultData.status === 'completed',
                  result: resultData,
                  duration_ms: toolDuration
                }
              })
            } catch (e) {
              // Log error if result parsing fails
              await supabase.rpc('log_orchestration_event', {
                p_session_id: session.id,
                p_event_type: 'tool_result',
                p_event_data: {
                  tool: toolCall.name,
                  tool_call_id: toolCall.id,
                  success: false,
                  error: 'Failed to parse result',
                  duration_ms: toolDuration
                }
              })
            }
            
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
          
          // Verify orchestrator achieved the user's goal
          // Find the LAST user message (not the first) to verify against the current request
          const userMessages = session.messages.filter(m => m.role === 'user' && !m.content?.startsWith('Verification failed'))
          const userInput = userMessages[userMessages.length - 1]?.content || ''
          const toolCallsSummary = session.messages
            .filter(m => m.toolCalls)
            .map(m => m.toolCalls)
            .flat()
          
          // Only use the current response for verification and final output
          const currentResponse = response.content
          
          const orchestratorVerification = await verify(
            {
              userInput,
              toolCalls: toolCallsSummary,
              finalResponse: currentResponse
            },
            `Fulfill user request: ${userInput}`,
            'orchestrator'
          )
          
          // Log verification result
          console.log('Verification result:', orchestratorVerification)
          
          // Log verification event
          await supabase.rpc('log_orchestration_event', {
            p_session_id: session.id,
            p_event_type: 'verification',
            p_event_data: {
              goal: `Fulfill user request: ${userInput}`,
              achieved: orchestratorVerification.goalAchieved,
              confidence: orchestratorVerification.confidence,
              issues: orchestratorVerification.issues || [],
              user_input: userInput, // Include the actual user input for debugging
              response_preview: currentResponse.substring(0, 200) + '...'
            }
          })
          
          // If verification failed with low confidence, retry
          if (!orchestratorVerification.goalAchieved && orchestratorVerification.confidence < 0.6) {
            console.log('Orchestrator verification failed, retrying with feedback')
            
            // Log retry event
            await supabase.rpc('log_orchestration_event', {
              p_session_id: session.id,
              p_event_type: 'retry',
              p_event_data: {
                reason: 'Verification failed',
                confidence: orchestratorVerification.confidence,
                issues: orchestratorVerification.issues || [],
                retry_message: `Verification failed. The previous response did not fully achieve the user's goal. Issues: ${orchestratorVerification.issues?.join(', ')}. Please address these issues and provide a correct response.`
              }
            })
            // Add feedback as a system message instead of user message
            // This prevents it from being saved as a user message in the chat history
            session.messages.push({
              role: 'system',
              content: `Verification failed. The previous response did not fully achieve the user's goal. Issues: ${orchestratorVerification.issues?.join(', ')}. Please address these issues and provide a correct response.`
            })
            continue // Retry the loop
          }
          
          // Include verification in response metadata
          const finalResponse = {
            content: currentResponse,
            verification: orchestratorVerification,
            threadId: null as string | null // Will be set by completeSession
          }
          
          // Log completion event
          await supabase.rpc('log_orchestration_event', {
            p_session_id: session.id,
            p_event_type: 'status_update',
            p_event_data: {
              from: 'running',
              to: 'completed',
              message: 'Orchestration completed successfully',
              verification: orchestratorVerification
            }
          })
          
          await completeSession(supabase, session, JSON.stringify(finalResponse))
          console.log(`Session ${session.id} completed successfully with verification`)
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