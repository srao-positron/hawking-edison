/**
 * Analysis Tools for Lambda Orchestrator
 * 
 * Analyze patterns, sentiment, consensus, and insights from agent responses.
 * Includes built-in verification to ensure analysis goals are met.
 */

import { ToolDefinition, ToolExecutionContext } from './index'
import { callLLMWithTools } from '../llm-client'
import { verify } from './verification'

export const analysisTools: ToolDefinition[] = [
  {
    name: 'analyzeResponses',
    description: 'Analyze patterns, sentiment, and insights from agent responses',
    parameters: {
      type: 'object',
      properties: {
        responses: {
          type: 'array',
          description: 'Responses to analyze'
        },
        focusAreas: {
          type: 'array',
          items: { type: 'string' },
          description: 'What to look for in analysis (sentiment, demographics, key concerns, consensus)'
        },
        groupBy: {
          type: 'string',
          description: 'How to group analysis (e.g., agent.demographics.age)'
        }
      },
      required: ['responses']
    },
    execute: async (
      args: { responses: any[]; focusAreas?: string[]; groupBy?: string },
      context: ToolExecutionContext
    ) => {
      const { responses, focusAreas = ['sentiment', 'key themes', 'patterns'], groupBy } = args
      
      // Prepare analysis prompt
      const analysisPrompt = `Analyze these ${responses.length} responses:

${JSON.stringify(responses, null, 2)}

Focus on: ${focusAreas.join(', ')}
${groupBy ? `Group analysis by: ${groupBy}` : ''}

Provide a comprehensive analysis including:
1. Overall patterns and themes
2. ${focusAreas.map(area => `Analysis of ${area}`).join('\n3. ')}
${groupBy ? '4. Breakdown by groups' : ''}
5. Key insights and takeaways
6. Any outliers or notable individual responses

Return a structured analysis.`

      const analysisResponse = await callLLMWithTools(
        [
          {
            role: 'system',
            content: 'You are an expert analyst. Provide thorough, data-driven analysis of responses.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        [],
        'claude'
      )
      
      // Parse analysis
      let analysis
      try {
        analysis = JSON.parse(analysisResponse.content || '{}')
      } catch {
        // If not JSON, structure it
        analysis = {
          summary: analysisResponse.content,
          responseCount: responses.length,
          focusAreas: focusAreas,
          timestamp: new Date().toISOString()
        }
      }
      
      // Verify the analysis achieved its goal
      const verificationGoal = `Analyze ${responses.length} responses focusing on ${focusAreas.join(', ')}`
      const verification = await verify(analysis, verificationGoal, 'analysis')
      
      if (!verification.goalAchieved && verification.confidence < 0.7) {
        // Retry with more specific instructions
        const retryResponse = await callLLMWithTools(
          [
            {
              role: 'system',
              content: 'You are an expert analyst. The previous analysis was incomplete. Please provide a more thorough analysis.'
            },
            {
              role: 'user',
              content: `${analysisPrompt}\n\nThe previous analysis had these issues: ${verification.issues?.join(', ')}\n\nPlease address these issues.`
            }
          ],
          [],
          'claude'
        )
        
        analysis = {
          ...analysis,
          revised: retryResponse.content,
          retryReason: verification.issues
        }
      }
      
      return {
        analysis,
        metadata: {
          responseCount: responses.length,
          focusAreas,
          groupBy,
          verification,
          analyzedAt: new Date().toISOString()
        }
      }
    }
  },
  
  {
    name: 'findConsensus',
    description: 'Find areas of agreement and disagreement among agents',
    parameters: {
      type: 'object',
      properties: {
        discussion: {
          type: 'any',
          description: 'Discussion or responses to analyze'
        },
        threshold: {
          type: 'number',
          description: 'Agreement threshold (0-1)',
          default: 0.7
        }
      },
      required: ['discussion']
    },
    execute: async (
      args: { discussion: any; threshold?: number },
      context: ToolExecutionContext
    ) => {
      const { discussion, threshold = 0.7 } = args
      
      const consensusPrompt = `Analyze this discussion/responses to find consensus and disagreement:

${JSON.stringify(discussion, null, 2)}

Agreement threshold: ${threshold} (${threshold * 100}% agreement needed for consensus)

Identify:
1. Strong consensus points (where most/all agree)
2. Partial consensus (where many but not all agree)
3. Points of disagreement
4. Nuanced positions that don't fit clear agreement/disagreement
5. Key insights from the diversity of views

Structure your response as JSON with these sections.`

      const consensusResponse = await callLLMWithTools(
        [
          {
            role: 'system',
            content: 'You are an expert at identifying consensus and synthesizing diverse viewpoints.'
          },
          {
            role: 'user',
            content: consensusPrompt
          }
        ],
        [],
        'claude'
      )
      
      // Parse consensus analysis
      let consensus
      try {
        consensus = JSON.parse(consensusResponse.content || '{}')
      } catch {
        // Structure if not JSON
        consensus = {
          summary: consensusResponse.content,
          threshold: threshold,
          analyzedAt: new Date().toISOString()
        }
      }
      
      // Verify consensus finding achieved its goal
      const verificationGoal = `Find consensus and disagreement in discussion with ${threshold * 100}% agreement threshold`
      const verification = await verify(consensus, verificationGoal, 'consensus')
      
      return {
        consensus,
        metadata: {
          threshold,
          verification,
          participantCount: Array.isArray(discussion) ? discussion.length : 
                          discussion.participants ? discussion.participants.length : 'unknown',
          analyzedAt: new Date().toISOString()
        }
      }
    }
  },
  
  {
    name: 'validateResults',
    description: 'Validate that results make sense and are accurate',
    parameters: {
      type: 'object',
      properties: {
        results: {
          type: 'any',
          description: 'Results to validate'
        },
        expectations: {
          type: 'string',
          description: 'What valid results should look like'
        },
        withAgents: {
          type: 'array',
          description: 'Optional agents to help validate'
        }
      },
      required: ['results']
    },
    execute: async (
      args: { results: any; expectations?: string; withAgents?: any[] },
      context: ToolExecutionContext
    ) => {
      const { results, expectations, withAgents } = args
      
      let validationPrompt = `Validate these results for accuracy and sensibility:

Results: ${JSON.stringify(results, null, 2)}

${expectations ? `Expected characteristics: ${expectations}` : 'Check for general validity and coherence'}

Perform thorough validation:
1. Check for internal consistency
2. Identify any logical errors or contradictions
3. Verify completeness
4. Flag any suspicious or unusual patterns
5. Assess overall quality and reliability

Provide a detailed validation report.`

      // If agents provided, get their validation input
      if (withAgents && withAgents.length > 0) {
        const agentValidations = await Promise.all(
          withAgents.map(async (agent) => {
            const response = await callLLMWithTools(
              [
                {
                  role: 'system',
                  content: `You are ${agent.name || agent.id} with expertise: ${agent.specification}. Validate these results from your perspective.`
                },
                {
                  role: 'user',
                  content: validationPrompt
                }
              ],
              [],
              'claude'
            )
            return {
              agent: agent.name || agent.id,
              validation: response.content
            }
          })
        )
        
        validationPrompt += `\n\nAgent validations:\n${JSON.stringify(agentValidations, null, 2)}`
      }
      
      // Main validation
      const validationResponse = await callLLMWithTools(
        [
          {
            role: 'system',
            content: 'You are a thorough validation system. Be skeptical but fair.'
          },
          {
            role: 'user',
            content: validationPrompt
          }
        ],
        [],
        'claude'
      )
      
      // Parse validation
      let validation
      try {
        validation = JSON.parse(validationResponse.content || '{}')
      } catch {
        validation = {
          report: validationResponse.content,
          validatedAt: new Date().toISOString()
        }
      }
      
      // Meta-verification: verify the validation itself
      const verificationGoal = 'Thoroughly validate results for accuracy and completeness'
      const verification = await verify(validation, verificationGoal, 'validation')
      
      return {
        validation,
        metadata: {
          hasExpectations: !!expectations,
          agentValidators: withAgents?.length || 0,
          verification,
          validatedAt: new Date().toISOString()
        }
      }
    }
  }
]