#!/usr/bin/env tsx
// Test LLM API keys

import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })

interface TestResult {
  provider: string
  model: string
  success: boolean
  response?: string
  error?: string
}

async function testAnthropic(): Promise<TestResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return [{
      provider: 'Anthropic',
      model: 'N/A',
      success: false,
      error: 'ANTHROPIC_API_KEY not found'
    }]
  }

  const results: TestResult[] = []
  
  // Test Claude 3.5 Sonnet
  try {
    console.log('Testing Anthropic Claude 3.5 Sonnet...')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Say "API key works!" in exactly 4 words.' }],
        max_tokens: 50
      })
    })

    if (response.ok) {
      const data = await response.json()
      results.push({
        provider: 'Anthropic',
        model: 'Claude 3.5 Sonnet',
        success: true,
        response: data.content[0].text
      })
    } else {
      const error = await response.text()
      results.push({
        provider: 'Anthropic',
        model: 'Claude 3.5 Sonnet',
        success: false,
        error: `HTTP ${response.status}: ${error}`
      })
    }
  } catch (error: any) {
    results.push({
      provider: 'Anthropic',
      model: 'Claude 3.5 Sonnet',
      success: false,
      error: error.message
    })
  }

  // Test Claude 3 Opus (when available)
  // Note: Using Sonnet as placeholder since Opus 4 isn't released yet
  try {
    console.log('Testing Anthropic Claude 3 Opus...')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        messages: [{ role: 'user', content: 'Say "Opus works!" in exactly 2 words.' }],
        max_tokens: 50
      })
    })

    if (response.ok) {
      const data = await response.json()
      results.push({
        provider: 'Anthropic',
        model: 'Claude 3 Opus',
        success: true,
        response: data.content[0].text
      })
    } else {
      const error = await response.text()
      results.push({
        provider: 'Anthropic',
        model: 'Claude 3 Opus',
        success: false,
        error: `HTTP ${response.status}: ${error}`
      })
    }
  } catch (error: any) {
    results.push({
      provider: 'Anthropic',
      model: 'Claude 3 Opus',
      success: false,
      error: error.message
    })
  }

  return results
}

async function testOpenAI(): Promise<TestResult[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return [{
      provider: 'OpenAI',
      model: 'N/A',
      success: false,
      error: 'OPENAI_API_KEY not found'
    }]
  }

  const results: TestResult[] = []

  // Test GPT-4o
  try {
    console.log('Testing OpenAI GPT-4o...')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Say "GPT-4o works!" in exactly 3 words.' }],
        max_tokens: 50
      })
    })

    if (response.ok) {
      const data = await response.json()
      results.push({
        provider: 'OpenAI',
        model: 'GPT-4o',
        success: true,
        response: data.choices[0].message.content
      })
    } else {
      const error = await response.text()
      results.push({
        provider: 'OpenAI',
        model: 'GPT-4o',
        success: false,
        error: `HTTP ${response.status}: ${error}`
      })
    }
  } catch (error: any) {
    results.push({
      provider: 'OpenAI',
      model: 'GPT-4o',
      success: false,
      error: error.message
    })
  }

  // Test GPT-4 Turbo
  try {
    console.log('Testing OpenAI GPT-4 Turbo...')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: 'Say "Turbo works!" in exactly 2 words.' }],
        max_tokens: 50
      })
    })

    if (response.ok) {
      const data = await response.json()
      results.push({
        provider: 'OpenAI',
        model: 'GPT-4 Turbo',
        success: true,
        response: data.choices[0].message.content
      })
    } else {
      const error = await response.text()
      results.push({
        provider: 'OpenAI',
        model: 'GPT-4 Turbo',
        success: false,
        error: `HTTP ${response.status}: ${error}`
      })
    }
  } catch (error: any) {
    results.push({
      provider: 'OpenAI',
      model: 'GPT-4 Turbo',
      success: false,
      error: error.message
    })
  }

  return results
}

async function runTests() {
  console.log('🔑 Testing LLM API Keys...\n')
  console.log('=' + '='.repeat(59))

  const allResults: TestResult[] = []

  // Test Anthropic
  console.log('\n🤖 Testing Anthropic API...')
  const anthropicResults = await testAnthropic()
  allResults.push(...anthropicResults)

  // Test OpenAI
  console.log('\n🤖 Testing OpenAI API...')
  const openAIResults = await testOpenAI()
  allResults.push(...openAIResults)

  // Display results
  console.log('\n' + '='.repeat(60))
  console.log('📊 Test Results:\n')

  const maxProviderLength = Math.max(...allResults.map(r => r.provider.length))
  const maxModelLength = Math.max(...allResults.map(r => r.model.length))

  allResults.forEach(result => {
    const provider = result.provider.padEnd(maxProviderLength)
    const model = result.model.padEnd(maxModelLength)
    const status = result.success ? '✅' : '❌'
    const message = result.success 
      ? `Response: "${result.response}"`
      : `Error: ${result.error}`
    
    console.log(`${status} ${provider} | ${model} | ${message}`)
  })

  const successCount = allResults.filter(r => r.success).length
  const totalCount = allResults.length

  console.log('\n' + '='.repeat(60))
  console.log(`Summary: ${successCount}/${totalCount} tests passed`)
  
  if (successCount === totalCount) {
    console.log('✅ All API keys are working correctly!\n')
  } else {
    console.log('⚠️  Some API keys failed. Please check the errors above.\n')
  }
}

runTests().catch(console.error)