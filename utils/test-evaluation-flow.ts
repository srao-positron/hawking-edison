#!/usr/bin/env npx tsx
/**
 * Test the new evaluation flow end-to-end
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

// Load environment variables
config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const API_URL = 'http://localhost:3000/api'

// Test user credentials
const TEST_EMAIL = 'test@hawkingedison.com'
const TEST_PASSWORD = 'TestUser123!@#'

interface TestCase {
  name: string
  input: string
  expectToolsNeeded: boolean
  expectedComplexity: 'simple' | 'moderate' | 'complex'
}

const testCases: TestCase[] = [
  {
    name: 'Simple math question',
    input: 'What is 2 + 2?',
    expectToolsNeeded: false,
    expectedComplexity: 'simple'
  },
  {
    name: 'Creative writing request',
    input: 'Write me a haiku about golden retrievers',
    expectToolsNeeded: false,
    expectedComplexity: 'simple'
  },
  {
    name: 'Complex business analysis',
    input: 'Should OpenAI buy Anthropic? Create agents to analyze this.',
    expectToolsNeeded: true,
    expectedComplexity: 'complex'
  },
  {
    name: 'Code review with agents',
    input: 'Create security and performance agents to review this code: function add(a, b) { return a + b }',
    expectToolsNeeded: true,
    expectedComplexity: 'moderate'
  }
]

async function runTest(testCase: TestCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`)
  console.log(`   Input: "${testCase.input}"`)
  
  try {
    // First, sign in as test user
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })
    
    if (authError || !authData.session) {
      throw new Error(`Authentication failed: ${authError?.message || 'No session'}`)
    }
    
    // Call Edge Function directly instead of API route
    const { data: response, error: edgeError } = await supabase.functions.invoke('interact', {
      body: {
        input: testCase.input,
        userId: authData.user!.id
      }
    })
    
    if (edgeError) {
      throw new Error(`Edge Function error: ${edgeError.message}`)
    }
    
    console.log(`   Session ID: ${response.data?.sessionId || response.sessionId}`)
    
    // Connect to Supabase to monitor the session (reuse authenticated client)
    const sessionId = response.data?.sessionId || response.sessionId
    
    // Subscribe to session updates
    return new Promise((resolve) => {
      const channel = supabase
        .channel(`test-orchestration:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orchestration_sessions',
            filter: `id=eq.${sessionId}`
          },
          async (payload) => {
            const session = payload.new as any
            console.log(`   Status: ${session.status}`)
            
            if (session.status === 'completed' && session.final_response) {
              try {
                const finalResponse = JSON.parse(session.final_response)
                
                // Check evaluation results
                if (finalResponse.evaluation) {
                  const { preEvaluation, postEvaluation, quality } = finalResponse.evaluation
                  
                  console.log('\n   📊 Pre-Evaluation:')
                  console.log(`      Needs tools: ${preEvaluation.needsTools}`)
                  console.log(`      Expected tools: ${preEvaluation.expectedTools.join(', ') || 'None'}`)
                  console.log(`      Complexity: ${preEvaluation.complexity}`)
                  console.log(`      Intent: ${preEvaluation.intent}`)
                  
                  console.log('\n   📈 Post-Evaluation:')
                  console.log(`      Goal achieved: ${postEvaluation.goalAchieved}`)
                  console.log(`      Tools used effectively: ${postEvaluation.toolsUsedEffectively}`)
                  console.log(`      Matches expectations: ${postEvaluation.matchesExpectations}`)
                  console.log(`      Confidence: ${postEvaluation.confidence}`)
                  console.log(`      Feedback: ${postEvaluation.feedback}`)
                  
                  console.log('\n   🎯 Quality Assessment:')
                  console.log(`      Score: ${quality.score.toFixed(2)}`)
                  console.log(`      Label: ${quality.label} (${quality.color})`)
                  
                  // Verify expectations
                  console.log('\n   ✅ Test Verification:')
                  const toolsMatch = preEvaluation.needsTools === testCase.expectToolsNeeded
                  const complexityMatch = preEvaluation.complexity === testCase.expectedComplexity
                  
                  console.log(`      Tools expectation: ${toolsMatch ? '✅ PASS' : '❌ FAIL'} (expected: ${testCase.expectToolsNeeded}, got: ${preEvaluation.needsTools})`)
                  console.log(`      Complexity expectation: ${complexityMatch ? '✅ PASS' : '❌ FAIL'} (expected: ${testCase.expectedComplexity}, got: ${preEvaluation.complexity})`)
                  
                  console.log('\n   Response preview:')
                  console.log(`      "${finalResponse.content.substring(0, 100)}..."`)
                } else {
                  console.log('   ⚠️  No evaluation data in response')
                }
              } catch (e) {
                console.error('   ❌ Error parsing response:', e)
              }
              
              channel.unsubscribe()
              resolve(true)
            } else if (session.status === 'failed') {
              console.log(`   ❌ Session failed: ${session.error}`)
              channel.unsubscribe()
              resolve(false)
            }
          }
        )
        .subscribe()
      
      // Timeout after 2 minutes
      setTimeout(() => {
        console.log('   ⏱️  Test timed out')
        channel.unsubscribe()
        resolve(false)
      }, 2 * 60 * 1000)
    })
  } catch (error) {
    console.error(`   ❌ Error: ${error}`)
    return false
  }
}

async function main() {
  console.log('🚀 Testing Evaluation Flow')
  console.log('========================\n')
  
  for (const testCase of testCases) {
    await runTest(testCase)
    console.log('\n' + '='.repeat(80))
  }
  
  console.log('\n✅ All tests completed!')
}

main().catch(console.error)