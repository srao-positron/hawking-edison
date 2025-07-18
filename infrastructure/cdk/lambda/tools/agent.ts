/**
 * Agent Tools for Lambda Orchestrator
 * 
 * Create agents with any persona, expertise, or perspective.
 * Agents are ephemeral - use memory tools for continuity.
 */

import { ToolDefinition, ToolExecutionContext } from './index'
import { callLLMWithTools } from '../llm-client'

// Store the context and tools for all agents to use
let globalContext: ToolExecutionContext | null = null
let availableTools: Record<string, ToolDefinition> = {}

export function setAgentContext(context: ToolExecutionContext, tools: Record<string, ToolDefinition>) {
  globalContext = context
  availableTools = tools
}

export function getAgentContext() {
  return { context: globalContext, tools: availableTools }
}

export const agentTools: ToolDefinition[] = [
  {
    name: 'createAgent',
    description: 'Create an agent with any persona, expertise, or perspective. The agent has full access to all tools and can think, respond, research, and take actions.',
    parameters: {
      type: 'object',
      properties: {
        specification: {
          type: 'string',
          description: 'Natural language description of who this agent is, what they know, and how they think'
        },
        name: {
          type: 'string',
          description: 'Optional name for the agent'
        }
      },
      required: ['specification']
    },
    execute: async (args: { specification: string; name?: string }, context: ToolExecutionContext) => {
      // Generate a unique ID for this agent
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Use LLM to expand the specification into a rich persona
      const personaResponse = await callLLMWithTools(
        [
          {
            role: 'system',
            content: `You are creating an agent persona. Expand the specification into a rich, detailed persona that includes:
              - Background and experience
              - Personality traits
              - Areas of expertise
              - Communication style
              - Biases and perspectives
              - How they approach problems
              - How they would use tools (search, analysis, creation, etc.)
              
              Note: This agent will have access to all available tools including search, data analysis, GitHub operations, and more.
              Return a detailed persona description.`
          },
          {
            role: 'user',
            content: `Create a detailed persona for: ${args.specification}`
          }
        ],
        [],
        'claude'
      )
      
      // Log agent creation as a tool_result event
      if (context.supabase) {
        await context.supabase.rpc('log_orchestration_event', {
          p_session_id: context.sessionId,
          p_event_type: 'tool_result',
          p_event_data: {
            tool: 'createAgent',
            success: true,
            result: {
              agent_id: agentId,
              name: args.name || `Agent ${agentId}`,
              specification: args.specification,
              persona_preview: personaResponse.content?.substring(0, 200) + '...'
            }
          }
        })
      }
      
      return {
        id: agentId,
        name: args.name,
        specification: args.specification,
        persona: personaResponse.content,
        created: new Date().toISOString()
      }
    }
  },
  
  {
    name: 'createMultipleAgents',
    description: 'Create multiple agents at once, useful for simulations or diverse panels',
    parameters: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'How many agents to create'
        },
        populationDescription: {
          type: 'string',
          description: 'Description of the population to create'
        },
        variations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional specific variations to ensure'
        }
      },
      required: ['count', 'populationDescription']
    },
    execute: async (
      args: { count: number; populationDescription: string; variations?: string[] },
      context: ToolExecutionContext
    ) => {
      const agents = []
      
      // Use LLM to generate diverse specifications
      const specificationsResponse = await callLLMWithTools(
        [
          {
            role: 'system',
            content: `You are creating a diverse population of agents. Generate ${args.count} unique agent specifications based on the population description.
              
              Each agent should be distinct and represent different perspectives within the population.
              ${args.variations ? `Ensure variation in: ${args.variations.join(', ')}` : ''}
              
              Return a JSON array of specifications.`
          },
          {
            role: 'user',
            content: `Create ${args.count} diverse agents for: ${args.populationDescription}`
          }
        ],
        [],
        'claude'
      )
      
      // Parse specifications and create agents
      let specifications: string[]
      try {
        specifications = JSON.parse(specificationsResponse.content || '[]')
      } catch {
        // Fallback if LLM doesn't return valid JSON
        specifications = Array(args.count).fill(null).map((_, i) => 
          `${args.populationDescription} - Individual ${i + 1} of ${args.count}`
        )
      }
      
      // Create each agent
      for (const spec of specifications) {
        const agent = await agentTools[0].execute({ specification: spec }, context)
        agents.push(agent)
      }
      
      return {
        agents,
        count: agents.length,
        populationDescription: args.populationDescription,
        variations: args.variations
      }
    }
  }
]