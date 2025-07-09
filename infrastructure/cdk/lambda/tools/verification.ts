/**
 * Verification system for ensuring LLM outputs meet their intended goals
 */

import { callLLMWithTools } from '../llm-client'

export interface VerificationResult {
  goalAchieved: boolean
  confidence: number // 0-1
  issues?: string[]
  suggestions?: string[]
}

/**
 * Verify that a result achieves its intended goal
 */
export async function verify(
  result: any,
  goal: string,
  resultType: 'agent' | 'analysis' | 'consensus' | 'discussion' | 'response' | 'validation' | 'orchestrator'
): Promise<VerificationResult> {
  const verificationPrompt = getVerificationPrompt(resultType, goal, result)
  
  const response = await callLLMWithTools(
    [
      {
        role: 'system',
        content: `You are a verification system. Your job is to determine if the output successfully achieves the stated goal.
          
          Be thorough but fair. Look for:
          1. Direct achievement of the goal
          2. Completeness and accuracy
          3. Any errors or omissions
          4. Quality of the output
          
          Return a JSON object with:
          {
            "goalAchieved": true/false,
            "confidence": 0.0-1.0,
            "issues": ["issue1", "issue2"] or [],
            "suggestions": ["suggestion1", "suggestion2"] or []
          }`
      },
      {
        role: 'user',
        content: verificationPrompt
      }
    ],
    [],
    'claude'
  )
  
  try {
    const verification = JSON.parse(response.content || '{}')
    return {
      goalAchieved: verification.goalAchieved ?? false,
      confidence: verification.confidence ?? 0,
      issues: verification.issues || [],
      suggestions: verification.suggestions || []
    }
  } catch {
    // If parsing fails, assume verification failed
    return {
      goalAchieved: false,
      confidence: 0,
      issues: ['Verification response could not be parsed'],
      suggestions: ['Ensure verification returns valid JSON']
    }
  }
}

/**
 * Get appropriate verification prompt based on result type
 */
function getVerificationPrompt(
  resultType: string,
  goal: string,
  result: any
): string {
  const basePrompt = `Goal: ${goal}\n\nResult to verify:\n${JSON.stringify(result, null, 2)}\n\n`
  
  switch (resultType) {
    case 'agent':
      return basePrompt + `Verify this agent creation:
        - Does the agent match the requested specification?
        - Is the persona rich and detailed enough?
        - Would this agent be useful for the intended purpose?`
    
    case 'analysis':
      return basePrompt + `Verify this analysis:
        - Does it cover all requested focus areas?
        - Are the insights meaningful and data-driven?
        - Is the analysis comprehensive and well-structured?`
    
    case 'consensus':
      return basePrompt + `Verify this consensus finding:
        - Are agreements and disagreements clearly identified?
        - Is the threshold properly applied?
        - Are nuanced positions captured?`
    
    case 'discussion':
      return basePrompt + `Verify this discussion:
        - Did all agents participate meaningfully?
        - Is the discussion on-topic and productive?
        - Does the style match what was requested?`
    
    case 'response':
      return basePrompt + `Verify these responses:
        - Did all agents respond to the prompt?
        - Are responses authentic to each agent's persona?
        - Is the requested structure followed (if any)?`
    
    case 'validation':
      return basePrompt + `Verify this validation:
        - Are all aspects thoroughly checked?
        - Are issues clearly identified?
        - Is the validation report comprehensive?`
    
    case 'orchestrator':
      return basePrompt + `Verify this orchestrator response:
        - Was the user's intent understood correctly?
        - Were appropriate tools used effectively?
        - Does the response fully satisfy the request?
        - Are there any signs of hallucination or error?`
    
    default:
      return basePrompt + `Verify this output achieves its goal.`
  }
}

/**
 * Retry a tool execution with verification feedback
 */
export async function retryWithFeedback(
  toolExecute: Function,
  originalArgs: any,
  verification: VerificationResult,
  context: any
): Promise<any> {
  // Add verification feedback to the arguments
  const enhancedArgs = {
    ...originalArgs,
    _verificationFeedback: {
      previousIssues: verification.issues,
      suggestions: verification.suggestions,
      instruction: 'Please address the issues identified in the previous attempt'
    }
  }
  
  // Retry the tool execution
  return await toolExecute(enhancedArgs, context)
}