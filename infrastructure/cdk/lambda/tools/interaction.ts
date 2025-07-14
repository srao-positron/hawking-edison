/**
 * Interaction Tools for Lambda Orchestrator
 * 
 * Enable agents to discuss, respond, and interact in various ways.
 */

import { ToolDefinition, ToolExecutionContext } from './index'
import { callLLMWithTools, LLMMessage } from '../llm-client'
import { getAgentContext } from './agent'
import { executeTool } from './index'

export const interactionTools: ToolDefinition[] = [
  {
    name: 'runDiscussion',
    description: 'Have agents discuss a topic together. They take turns speaking and can respond to each other.',
    parameters: {
      type: 'object',
      properties: {
        agents: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of agents who will participate'
        },
        topic: {
          type: 'string',
          description: 'What they should discuss'
        },
        style: {
          type: 'string',
          description: 'Discussion style (debate, brainstorm, analysis, negotiation) - default: collaborative'
        },
        rounds: {
          type: 'number',
          description: 'How many rounds of discussion (default: 3)'
        }
      },
      required: ['agents', 'topic']
    },
    execute: async (
      args: { agents: any[]; topic: string; style?: string; rounds?: number },
      context: ToolExecutionContext
    ) => {
      const { agents, topic, style = 'collaborative', rounds = 3 } = args
      const discussion = []
      
      // Initialize discussion context
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: `You are facilitating a ${style} discussion about: ${topic}
            
            The following agents are participating:
            ${agents.map((a, i) => `${i + 1}. ${a.name || `Agent ${a.id}`}: ${a.persona || a.specification}`).join('\n')}
            
            Generate realistic responses for each agent based on their persona.
            Make the discussion dynamic and engaging.`
        }
      ]
      
      // Run discussion rounds
      for (let round = 0; round < rounds; round++) {
        for (const agent of agents) {
          // Get available tools for agents
          const { tools } = getAgentContext()
          
          // Generate agent's contribution with tool access
          const response = await callLLMWithTools(
            [
              ...messages,
              {
                role: 'user',
                content: `What does ${agent.name || `Agent ${agent.id}`} say next in this ${style} discussion? 
                  Consider their persona: ${agent.persona || agent.specification}
                  This is round ${round + 1} of ${rounds}.
                  
                  You have access to tools if you need to look up information, analyze data, or take actions to support your points.`
              }
            ],
            Object.values(tools || {}),
            'claude'
          )
          
          // Log agent processing as thinking event
          if (context.supabase && response.content) {
            await context.supabase.rpc('log_orchestration_event', {
              p_session_id: context.sessionId,
              p_event_type: 'thinking',
              p_event_data: {
                content: response.content,
                step: 'agent_discussion',
                agent_context: {
                  agent_id: agent.id,
                  agent_name: agent.name || agent.id,
                  is_key_decision: response.tool_calls && response.tool_calls.length > 0,
                  thought_type: 'discussion_contribution'
                }
              }
            })
          }
          
          // Handle any tool calls made by the agent
          let finalContent = response.content
          if (response.tool_calls && response.tool_calls.length > 0) {
            const toolResults = []
            const { context } = getAgentContext()
            
            for (const toolCall of response.tool_calls) {
              try {
                let result: any
                
                // Check if this is an MCP tool
                if (toolCall.name.startsWith('mcp_')) {
                  // Execute via MCP proxy
                  const mcpProxy = new (await import('../mcp-proxy')).MCPProxy(
                    context!.supabase,
                    context!.sessionId,
                    undefined // No threadId for sub-agents
                  )
                  const originalToolName = toolCall.name.substring(4) // Remove 'mcp_' prefix
                  result = await mcpProxy.executeTool(context!.userId, originalToolName, toolCall.arguments)
                } else {
                  // Execute regular tool
                  result = await executeTool(toolCall.name, toolCall.arguments, context!)
                }
                
                toolResults.push({
                  tool: toolCall.name,
                  result: result
                })
              } catch (error) {
                toolResults.push({
                  tool: toolCall.name,
                  error: error instanceof Error ? error.message : 'Tool execution failed'
                })
              }
            }
            
            // Get the agent's final response after using tools
            const finalResponse = await callLLMWithTools(
              [
                ...messages,
                {
                  role: 'assistant',
                  content: response.content,
                  tool_calls: response.tool_calls
                },
                {
                  role: 'tool',
                  content: JSON.stringify(toolResults)
                },
                {
                  role: 'user',
                  content: `Based on the tool results, what is ${agent.name || agent.id}'s contribution to the discussion?`
                }
              ],
              [],
              'claude'
            )
            
            finalContent = finalResponse.content
          }
          
          const contribution = {
            agent: agent.name || agent.id,
            content: finalContent,
            round: round + 1,
            timestamp: new Date().toISOString()
          }
          
          discussion.push(contribution)
          
          // Log discussion contribution as tool_result event
          if (context.supabase) {
            await context.supabase.rpc('log_orchestration_event', {
              p_session_id: context.sessionId,
              p_event_type: 'tool_result',
              p_event_data: {
                tool: 'runDiscussion',
                success: true,
                result: {
                  agent_id: agent.id,
                  agent_name: agent.name || agent.id,
                  message: finalContent,
                  round: round + 1,
                  topic: topic,
                  style: style
                }
              }
            })
          }
          
          // Add to context for next speaker
          messages.push({
            role: 'assistant',
            content: `${agent.name || agent.id}: ${response.content}`
          })
        }
      }
      
      return {
        topic,
        style,
        participants: agents.map(a => ({ id: a.id, name: a.name })),
        discussion,
        rounds: rounds,
        completedAt: new Date().toISOString()
      }
    }
  },
  
  {
    name: 'gatherIndependentResponses',
    description: 'Get responses from many agents independently (they don\'t see each other\'s responses)',
    parameters: {
      type: 'object',
      properties: {
        agents: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of agents to respond'
        },
        prompt: {
          type: 'string',
          description: 'What each agent should respond to'
        },
        structured: {
          type: 'boolean',
          description: 'Whether to ask for structured responses (default: false)'
        }
      },
      required: ['agents', 'prompt']
    },
    execute: async (
      args: { agents: any[]; prompt: string; structured?: boolean },
      context: ToolExecutionContext
    ) => {
      const { agents, prompt, structured = false } = args
      const responses = []
      
      // Gather responses in parallel
      const responsePromises = agents.map(async (agent) => {
        const systemPrompt = structured
          ? `You are ${agent.name || agent.id} with persona: ${agent.persona || agent.specification}
             Respond to the prompt with a structured analysis including:
             - Initial reaction
             - Key points
             - Concerns or risks
             - Recommendation`
          : `You are ${agent.name || agent.id} with persona: ${agent.persona || agent.specification}
             Respond naturally and authentically to the prompt.`
        
        // Get available tools for agents
        const { tools } = getAgentContext()
        
        const response = await callLLMWithTools(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt + '\n\nYou have access to tools if you need to research, analyze data, or gather information for your response.' }
          ],
          Object.values(tools || {}),
          'claude'
        )
        
        // Handle any tool calls made by the agent
        let finalContent = response.content
        if (response.tool_calls && response.tool_calls.length > 0) {
          const toolResults = []
          const { context } = getAgentContext()
          
          for (const toolCall of response.tool_calls) {
            try {
              let result: any
              
              // Check if this is an MCP tool
              if (toolCall.name.startsWith('mcp_')) {
                // Execute via MCP proxy
                const mcpProxy = new (await import('../mcp-proxy')).MCPProxy(
                  context!.supabase,
                  context!.sessionId,
                  undefined // No threadId for sub-agents
                )
                const originalToolName = toolCall.name.substring(4) // Remove 'mcp_' prefix
                result = await mcpProxy.executeTool(context!.userId, originalToolName, toolCall.arguments)
              } else {
                // Execute regular tool
                result = await executeTool(toolCall.name, toolCall.arguments, context!)
              }
              
              toolResults.push({
                tool: toolCall.name,
                result: result
              })
            } catch (error) {
              toolResults.push({
                tool: toolCall.name,
                error: error instanceof Error ? error.message : 'Tool execution failed'
              })
            }
          }
          
          // Get the agent's final response after using tools
          const finalResponse = await callLLMWithTools(
            [
              { role: 'system', content: systemPrompt },
              {
                role: 'assistant',
                content: response.content,
                tool_calls: response.tool_calls
              },
              {
                role: 'tool',
                content: JSON.stringify(toolResults)
              },
              {
                role: 'user',
                content: 'Based on your tool results, provide your final response to the original prompt.'
              }
            ],
            [],
            'claude'
          )
          
          finalContent = finalResponse.content
        }
        
        return {
          agent: agent.name || agent.id,
          agentId: agent.id,
          response: finalContent,
          timestamp: new Date().toISOString()
        }
      })
      
      const allResponses = await Promise.all(responsePromises)
      
      return {
        prompt,
        structured,
        participantCount: agents.length,
        responses: allResponses,
        gatheredAt: new Date().toISOString()
      }
    }
  },
  
  {
    name: 'conductInterview',
    description: 'Have one agent interview another with follow-up questions',
    parameters: {
      type: 'object',
      properties: {
        interviewer: {
          type: 'object',
          description: 'Agent conducting the interview'
        },
        interviewee: {
          type: 'object',
          description: 'Agent being interviewed'
        },
        topic: {
          type: 'string',
          description: 'Interview topic'
        },
        depth: {
          type: 'number',
          description: 'How many follow-up questions (default: 3)'
        }
      },
      required: ['interviewer', 'interviewee', 'topic']
    },
    execute: async (
      args: { interviewer: any; interviewee: any; topic: string; depth?: number },
      context: ToolExecutionContext
    ) => {
      const { interviewer, interviewee, topic, depth = 3 } = args
      const interview = []
      
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: `You are conducting an interview between:
            Interviewer: ${interviewer.name || interviewer.id} - ${interviewer.persona || interviewer.specification}
            Interviewee: ${interviewee.name || interviewee.id} - ${interviewee.persona || interviewee.specification}
            
            Topic: ${topic}
            
            Generate realistic questions and answers based on their personas.`
        }
      ]
      
      // Initial question
      const initialQuestion = await callLLMWithTools(
        [
          ...messages,
          {
            role: 'user',
            content: `What question does ${interviewer.name || 'the interviewer'} ask about ${topic}?`
          }
        ],
        [],
        'claude'
      )
      
      interview.push({
        speaker: interviewer.name || interviewer.id,
        type: 'question',
        content: initialQuestion.content,
        timestamp: new Date().toISOString()
      })
      
      messages.push({
        role: 'assistant',
        content: `Interviewer: ${initialQuestion.content}`
      })
      
      // Conduct interview with follow-ups
      for (let i = 0; i < depth + 1; i++) {
        // Get available tools for agents
        const { tools } = getAgentContext()
        
        // Get answer with tool access
        const answer = await callLLMWithTools(
          [
            ...messages,
            {
              role: 'user',
              content: `How does ${interviewee.name || 'the interviewee'} respond to this question? You have access to tools if you need to look up information or verify facts.`
            }
          ],
          Object.values(tools || {}),
          'claude'
        )
        
        interview.push({
          speaker: interviewee.name || interviewee.id,
          type: 'answer',
          content: answer.content,
          timestamp: new Date().toISOString()
        })
        
        messages.push({
          role: 'assistant',
          content: `Interviewee: ${answer.content}`
        })
        
        // Get follow-up question if not last round
        if (i < depth) {
          const followUp = await callLLMWithTools(
            [
              ...messages,
              {
                role: 'user',
                content: `Based on that answer, what follow-up question does ${interviewer.name || 'the interviewer'} ask?`
              }
            ],
            [],
            'claude'
          )
          
          interview.push({
            speaker: interviewer.name || interviewer.id,
            type: 'follow-up',
            content: followUp.content,
            timestamp: new Date().toISOString()
          })
          
          messages.push({
            role: 'assistant',
            content: `Interviewer: ${followUp.content}`
          })
        }
      }
      
      return {
        topic,
        interviewer: { id: interviewer.id, name: interviewer.name },
        interviewee: { id: interviewee.id, name: interviewee.name },
        transcript: interview,
        questionCount: interview.filter(i => i.type !== 'answer').length,
        completedAt: new Date().toISOString()
      }
    }
  }
]