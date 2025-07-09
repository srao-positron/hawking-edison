/**
 * Interaction Tools for Lambda Orchestrator
 * 
 * Enable agents to discuss, respond, and interact in various ways.
 */

import { ToolDefinition, ToolExecutionContext } from './index'
import { callLLMWithTools, LLMMessage } from '../llm-client'

export const interactionTools: ToolDefinition[] = [
  {
    name: 'runDiscussion',
    description: 'Have agents discuss a topic together. They take turns speaking and can respond to each other.',
    parameters: {
      type: 'object',
      properties: {
        agents: {
          type: 'array',
          description: 'Array of agents who will participate'
        },
        topic: {
          type: 'string',
          description: 'What they should discuss'
        },
        style: {
          type: 'string',
          description: 'Discussion style (debate, brainstorm, analysis, negotiation)',
          default: 'collaborative'
        },
        rounds: {
          type: 'number',
          description: 'How many rounds of discussion',
          default: 3
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
          // Generate agent's contribution
          const response = await callLLMWithTools(
            [
              ...messages,
              {
                role: 'user',
                content: `What does ${agent.name || `Agent ${agent.id}`} say next in this ${style} discussion? 
                  Consider their persona: ${agent.persona || agent.specification}
                  This is round ${round + 1} of ${rounds}.`
              }
            ],
            [],
            'claude'
          )
          
          const contribution = {
            agent: agent.name || agent.id,
            content: response.content,
            round: round + 1,
            timestamp: new Date().toISOString()
          }
          
          discussion.push(contribution)
          
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
          description: 'Array of agents to respond'
        },
        prompt: {
          type: 'string',
          description: 'What each agent should respond to'
        },
        structured: {
          type: 'boolean',
          description: 'Whether to ask for structured responses',
          default: false
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
        
        const response = await callLLMWithTools(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          [],
          'claude'
        )
        
        return {
          agent: agent.name || agent.id,
          agentId: agent.id,
          response: response.content,
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
          description: 'How many follow-up questions',
          default: 3
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
        // Get answer
        const answer = await callLLMWithTools(
          [
            ...messages,
            {
              role: 'user',
              content: `How does ${interviewee.name || 'the interviewee'} respond to this question?`
            }
          ],
          [],
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