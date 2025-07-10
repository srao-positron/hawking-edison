import { serve } from 'https://deno.land/std@0.177.1/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { authenticateRequest } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { ApiError, ErrorCodes } from '../_shared/errors.ts'
import { logger } from '../_shared/logger.ts'
import { OpenAI } from 'https://esm.sh/openai@4.28.0'

interface InteractStreamRequest {
  threadId: string
  input: string
}

// SSE headers for streaming
const sseHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    const { user, supabase } = await authenticateRequest(req)
    
    if (req.method !== 'POST') {
      throw new ApiError(ErrorCodes.METHOD_NOT_ALLOWED, 'Only POST method allowed')
    }

    const body: InteractStreamRequest = await req.json()
    
    if (!body.threadId || !body.input) {
      throw new ApiError(ErrorCodes.VALIDATION_ERROR, 'threadId and input are required')
    }

    // Verify thread ownership
    const { data: thread } = await supabase
      .from('threads')
      .select('id, name')
      .eq('id', body.threadId)
      .eq('user_id', user.id)
      .single()

    if (!thread) {
      throw new ApiError(ErrorCodes.NOT_FOUND, 'Thread not found')
    }

    // Add user message
    const { data: userMessage } = await supabase
      .from('messages')
      .insert({
        thread_id: body.threadId,
        role: 'user',
        content: body.input,
      })
      .select()
      .single()

    // Create orchestration session
    const { data: session } = await supabase
      .from('orchestration_sessions')
      .insert({
        user_id: user.id,
        thread_id: body.threadId,
        status: 'processing',
        streaming_enabled: true,
        messages: [{ role: 'user', content: body.input }],
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Helper to send SSE events
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        try {
          // Send initial session info
          sendEvent('session_start', {
            sessionId: session.id,
            threadId: body.threadId
          })

          // Initialize OpenAI
          const openai = new OpenAI({
            apiKey: Deno.env.get('OPENAI_API_KEY')!,
          })

          // Get thread history
          const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('thread_id', body.threadId)
            .order('created_at', { ascending: true })

          // Build conversation history
          const conversationHistory = messages?.map(m => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content
          })) || []

          // Add thinking process
          sendEvent('thinking', {
            type: 'planning',
            content: 'Analyzing your request and determining the best approach...'
          })

          await supabase
            .from('llm_thoughts')
            .insert({
              thread_id: body.threadId,
              thought_type: 'planning',
              content: 'Analyzing your request and determining the best approach...'
            })

          // Stream from OpenAI
          const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: `You are an AI orchestrator that helps users by using tools.
                
Available tools:
- createAgent: Create an agent with any persona or expertise
- runDiscussion: Have agents discuss a topic
- gatherResponses: Get independent responses from agents
- analyzeResults: Analyze and synthesize information
- createVisualization: Create charts, diagrams, or dashboards

When you need to use a tool, respond with:
TOOL: toolName
PARAMS: { ... }

Otherwise, respond normally to the user.`
              },
              ...conversationHistory
            ],
            stream: true,
            temperature: 0.7,
          })

          let fullResponse = ''
          let currentTool = null
          let toolParams = ''
          let isCollectingParams = false

          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta
            
            if (delta?.content) {
              fullResponse += delta.content
              
              // Check for tool invocation
              if (delta.content.includes('TOOL:')) {
                isCollectingParams = true
                currentTool = delta.content.split('TOOL:')[1].trim()
                sendEvent('tool_start', {
                  tool: currentTool,
                  status: 'preparing'
                })
              } else if (isCollectingParams && delta.content.includes('PARAMS:')) {
                // Start collecting parameters
                toolParams = delta.content.split('PARAMS:')[1]
              } else if (isCollectingParams) {
                toolParams += delta.content
                
                // Check if we have complete JSON
                try {
                  const params = JSON.parse(toolParams.trim())
                  isCollectingParams = false
                  
                  // Execute tool
                  sendEvent('tool_execute', {
                    tool: currentTool,
                    params,
                    status: 'executing'
                  })
                  
                  // Record tool execution
                  const { data: toolExecution } = await supabase
                    .from('tool_executions')
                    .insert({
                      session_id: session.id,
                      tool_name: currentTool,
                      parameters: params,
                      status: 'completed',
                      started_at: new Date().toISOString(),
                      completed_at: new Date().toISOString()
                    })
                    .select()
                    .single()
                  
                  // Execute the tool
                  const toolResult = await executeTool(currentTool, params, {
                    supabase,
                    userId: user.id,
                    threadId: body.threadId,
                    toolExecutionId: toolExecution.id
                  })
                  
                  sendEvent('tool_complete', {
                    tool: currentTool,
                    result: toolResult
                  })
                  
                  // Reset for next tool
                  currentTool = null
                  toolParams = ''
                } catch (e) {
                  // Still collecting params
                }
              } else {
                // Regular assistant message
                sendEvent('token', {
                  content: delta.content
                })
              }
            }
          }

          // Save assistant message
          await supabase
            .from('messages')
            .insert({
              thread_id: body.threadId,
              role: 'assistant',
              content: fullResponse,
            })

          // Update session
          await supabase
            .from('orchestration_sessions')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              final_response: fullResponse
            })
            .eq('id', session.id)

          sendEvent('complete', {
            sessionId: session.id,
            message: 'Orchestration completed'
          })

          controller.close()
        } catch (error) {
          logger.error('Streaming error', error)
          sendEvent('error', {
            message: error.message
          })
          controller.close()
        }
      }
    })

    return new Response(stream, { headers: sseHeaders })

  } catch (error) {
    logger.error('Streaming interaction failed', error)
    
    if (error instanceof ApiError) {
      return new Response(
        JSON.stringify({ error: error.message, code: error.code }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: error.statusCode,
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error', code: ErrorCodes.INTERNAL_ERROR }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// Import the actual tools
import { createAgent, runDiscussion, gatherResponses, analyzeResults } from '../_shared/tools/agent.ts'
import { createVisualization } from '../_shared/tools/visualization.ts'

// Tool registry
const toolRegistry = {
  createAgent,
  runDiscussion,
  gatherResponses,
  analyzeResults,
  createVisualization
}

// Execute tool with proper context
async function executeTool(toolName: string, params: any, context: any) {
  const tool = toolRegistry[toolName as keyof typeof toolRegistry]
  
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`)
  }

  // Execute the tool
  const result = await tool.execute(params, context)
  
  // For agent creation, ensure sub-thread is created
  if (toolName === 'createAgent' && result.agentId) {
    // Create a sub-thread for this agent
    const { data: agentThread } = await context.supabase
      .from('threads')
      .insert({
        user_id: context.userId,
        parent_thread_id: context.threadId,
        name: `Agent: ${params.specification}`,
        auto_generated_name: `Agent: ${params.specification}`
      })
      .select()
      .single()

    // Store agent conversation
    await context.supabase
      .from('agent_conversations')
      .insert({
        parent_thread_id: context.threadId,
        tool_execution_id: context.toolExecutionId,
        agent_specification: params.specification,
        messages: result.messages || []
      })

    return {
      ...result,
      threadId: agentThread.id
    }
  }

  return result
}