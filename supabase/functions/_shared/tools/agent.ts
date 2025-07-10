/**
 * Agent Tools for Hawking Edison
 * 
 * These tools allow the LLM orchestrator to create and manage agents
 * for various tasks like discussions, analysis, and problem-solving.
 */

import { OpenAI } from 'https://esm.sh/openai@4.28.0'

interface AgentContext {
  supabase: any
  userId: string
  threadId: string
  toolExecutionId?: string
}

interface Agent {
  id: string
  specification: string
  persona?: string
  capabilities?: string[]
}

// Tool: Create a single agent
export const createAgent = {
  name: 'createAgent',
  description: 'Create an agent with specific expertise or persona',
  parameters: {
    specification: {
      type: 'string',
      description: 'Natural language description of who this agent is and what they can do',
      required: true
    }
  },
  execute: async ({ specification }: { specification: string }, context: AgentContext) => {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!,
    })

    // Generate agent persona
    const personaResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Create a detailed persona for an AI agent based on the specification. Include background, expertise, communication style, and key traits.'
        },
        {
          role: 'user',
          content: specification
        }
      ],
      temperature: 0.8,
      max_tokens: 300
    })

    const persona = personaResponse.choices[0]?.message?.content || specification
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Initial agent interaction
    const initialMessages = [
      { role: 'system', content: `You are an AI agent with the following persona:\n\n${persona}` },
      { role: 'user', content: 'Please introduce yourself and explain how you can help.' }
    ]

    const introResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: initialMessages,
      temperature: 0.7,
      max_tokens: 500
    })

    const introduction = introResponse.choices[0]?.message?.content || ''

    // Store agent data
    const messages = [
      ...initialMessages,
      { role: 'assistant', content: introduction }
    ]

    return {
      agentId,
      specification,
      persona,
      introduction,
      messages,
      success: true
    }
  }
}

// Tool: Create multiple agents
export const createMultipleAgents = {
  name: 'createMultipleAgents',
  description: 'Create multiple agents at once for complex scenarios',
  parameters: {
    specifications: {
      type: 'array',
      description: 'Array of agent specifications',
      required: true
    }
  },
  execute: async ({ specifications }: { specifications: string[] }, context: AgentContext) => {
    const agents = await Promise.all(
      specifications.map(spec => createAgent.execute({ specification: spec }, context))
    )

    return {
      agents,
      count: agents.length,
      success: true
    }
  }
}

// Tool: Run a discussion between agents
export const runDiscussion = {
  name: 'runDiscussion',
  description: 'Have multiple agents discuss a topic, question, or problem',
  parameters: {
    agents: {
      type: 'array',
      description: 'Array of agent objects or specifications',
      required: true
    },
    topic: {
      type: 'string',
      description: 'The topic or question for agents to discuss',
      required: true
    },
    rounds: {
      type: 'number',
      description: 'Number of discussion rounds (default: 3)',
      required: false
    }
  },
  execute: async ({ agents, topic, rounds = 3 }: any, context: AgentContext) => {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!,
    })

    // Ensure we have agent objects
    const agentObjects: Agent[] = await Promise.all(
      agents.map(async (agent: any) => {
        if (typeof agent === 'string') {
          const result = await createAgent.execute({ specification: agent }, context)
          return {
            id: result.agentId,
            specification: agent,
            persona: result.persona
          }
        }
        return agent
      })
    )

    const discussion: any[] = []
    
    // Initial prompt
    discussion.push({
      role: 'moderator',
      content: `Let's discuss: ${topic}\n\nWe have ${agentObjects.length} participants. Each will share their perspective.`
    })

    // Run discussion rounds
    for (let round = 0; round < rounds; round++) {
      for (const agent of agentObjects) {
        // Build context for this agent
        const agentContext = [
          { role: 'system', content: agent.persona || agent.specification },
          { role: 'user', content: `The topic is: ${topic}\n\nPrevious discussion:\n${
            discussion.slice(-5).map(d => `${d.role}: ${d.content}`).join('\n\n')
          }\n\nWhat is your perspective?` }
        ]

        const response = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: agentContext,
          temperature: 0.8,
          max_tokens: 400
        })

        const agentResponse = response.choices[0]?.message?.content || ''
        
        discussion.push({
          role: `Agent ${agent.id}`,
          agent: agent.specification,
          content: agentResponse,
          round: round + 1
        })
      }
    }

    // Generate summary
    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a skilled moderator. Summarize the key points, areas of agreement, and different perspectives from this discussion.'
        },
        {
          role: 'user',
          content: JSON.stringify(discussion)
        }
      ],
      temperature: 0.7,
      max_tokens: 600
    })

    const summary = summaryResponse.choices[0]?.message?.content || ''

    // Store discussion
    const { data: agentConvo } = await context.supabase
      .from('agent_conversations')
      .insert({
        parent_thread_id: context.threadId,
        tool_execution_id: context.toolExecutionId,
        agent_specification: `Discussion: ${topic}`,
        messages: discussion,
        metadata: {
          topic,
          agents: agentObjects,
          rounds,
          summary
        }
      })
      .select()
      .single()

    return {
      discussionId: agentConvo?.id,
      topic,
      participants: agentObjects.length,
      rounds: discussion.length,
      summary,
      discussion: discussion.slice(1), // Exclude moderator intro
      success: true
    }
  }
}

// Tool: Gather independent responses
export const gatherResponses = {
  name: 'gatherResponses',
  description: 'Get independent responses from multiple agents without them interacting',
  parameters: {
    agents: {
      type: 'array',
      description: 'Array of agent objects or specifications',
      required: true
    },
    prompt: {
      type: 'string',
      description: 'The prompt or question to ask each agent',
      required: true
    }
  },
  execute: async ({ agents, prompt }: any, context: AgentContext) => {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!,
    })

    // Ensure we have agent objects
    const agentObjects: Agent[] = await Promise.all(
      agents.map(async (agent: any) => {
        if (typeof agent === 'string') {
          const result = await createAgent.execute({ specification: agent }, context)
          return {
            id: result.agentId,
            specification: agent,
            persona: result.persona
          }
        }
        return agent
      })
    )

    // Gather responses in parallel
    const responses = await Promise.all(
      agentObjects.map(async (agent) => {
        const response = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: agent.persona || agent.specification },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 600
        })

        return {
          agentId: agent.id,
          agent: agent.specification,
          response: response.choices[0]?.message?.content || ''
        }
      })
    )

    // Store responses
    await context.supabase
      .from('agent_conversations')
      .insert({
        parent_thread_id: context.threadId,
        tool_execution_id: context.toolExecutionId,
        agent_specification: `Independent Responses: ${prompt.substring(0, 50)}...`,
        messages: responses.map(r => ({
          role: 'assistant',
          content: r.response,
          metadata: { agent: r.agent }
        })),
        metadata: {
          prompt,
          agents: agentObjects,
          responseCount: responses.length
        }
      })

    return {
      prompt,
      responseCount: responses.length,
      responses,
      success: true
    }
  }
}

// Tool: Analyze and synthesize results
export const analyzeResults = {
  name: 'analyzeResults',
  description: 'Analyze and synthesize results from agent interactions',
  parameters: {
    data: {
      type: 'object',
      description: 'Data to analyze (discussions, responses, etc.)',
      required: true
    },
    analysisType: {
      type: 'string',
      description: 'Type of analysis: consensus, comparison, synthesis, evaluation',
      required: true
    },
    criteria: {
      type: 'array',
      description: 'Specific criteria or aspects to analyze',
      required: false
    }
  },
  execute: async ({ data, analysisType, criteria }: any, context: AgentContext) => {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!,
    })

    // Build analysis prompt based on type
    let systemPrompt = 'You are an expert analyst. '
    let userPrompt = ''

    switch (analysisType) {
      case 'consensus':
        systemPrompt += 'Find areas of agreement and consensus among different viewpoints.'
        userPrompt = `Analyze the following data and identify consensus points:\n\n${JSON.stringify(data, null, 2)}`
        break
      
      case 'comparison':
        systemPrompt += 'Compare and contrast different perspectives, highlighting key differences.'
        userPrompt = `Compare the following perspectives:\n\n${JSON.stringify(data, null, 2)}`
        break
      
      case 'synthesis':
        systemPrompt += 'Synthesize multiple viewpoints into a coherent, integrated understanding.'
        userPrompt = `Synthesize the following information:\n\n${JSON.stringify(data, null, 2)}`
        break
      
      case 'evaluation':
        systemPrompt += 'Evaluate the quality, validity, and usefulness of different responses.'
        userPrompt = `Evaluate the following responses:\n\n${JSON.stringify(data, null, 2)}`
        break
      
      default:
        systemPrompt += 'Provide a thorough analysis.'
        userPrompt = `Analyze the following:\n\n${JSON.stringify(data, null, 2)}`
    }

    if (criteria && criteria.length > 0) {
      userPrompt += `\n\nFocus on these criteria: ${criteria.join(', ')}`
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 1000
    })

    const analysis = response.choices[0]?.message?.content || ''

    // Store analysis
    await context.supabase
      .from('llm_thoughts')
      .insert({
        thread_id: context.threadId,
        thought_type: 'reflection',
        content: analysis,
        metadata: {
          analysisType,
          criteria,
          dataSize: JSON.stringify(data).length
        }
      })

    return {
      analysisType,
      analysis,
      criteria,
      success: true
    }
  }
}

// Tool: Find consensus among agents
export const findConsensus = {
  name: 'findConsensus',
  description: 'Find areas of agreement among multiple agent responses',
  parameters: {
    responses: {
      type: 'array',
      description: 'Array of agent responses to analyze',
      required: true
    },
    topic: {
      type: 'string',
      description: 'The topic being discussed',
      required: true
    }
  },
  execute: async ({ responses, topic }: any, context: AgentContext) => {
    return analyzeResults.execute({
      data: { responses, topic },
      analysisType: 'consensus'
    }, context)
  }
}