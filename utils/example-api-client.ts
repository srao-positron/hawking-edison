#!/usr/bin/env node

// Example CLI client for Hawking Edison API
// Usage: API_KEY=hke_live_xxx tsx utils/example-api-client.ts "Your question here"

import 'dotenv/config'
import fetch from 'node-fetch'

const API_KEY = process.env.API_KEY || process.env.HAWKING_EDISON_API_KEY
const API_BASE_URL = process.env.API_BASE_URL || 'https://bknpldydmkzupsfagnva.supabase.co'

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function callHawkingEdison(input: string) {
  if (!API_KEY) {
    log('Error: API_KEY environment variable not set', 'red')
    log('Usage: API_KEY=hke_live_xxx tsx utils/example-api-client.ts "Your question"', 'yellow')
    process.exit(1)
  }

  log('\n🤖 Hawking Edison CLI Client\n', 'blue')
  log(`Input: "${input}"`, 'gray')
  log('Sending request...', 'yellow')

  try {
    const response = await fetch(`${API_BASE_URL}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        input,
        provider: 'anthropic', // or 'openai'
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      log(`\nError: ${response.status} ${response.statusText}`, 'red')
      log(`Details: ${JSON.stringify(error, null, 2)}`, 'red')
      process.exit(1)
    }

    const data = await response.json()
    
    log('\n✅ Success!', 'green')
    log('\nResponse:', 'blue')
    console.log(data.data.response)
    
    if (data.data.usage) {
      log('\nUsage:', 'gray')
      log(`  Total tokens: ${data.data.usage.totalTokens}`, 'gray')
      log(`  Prompt tokens: ${data.data.usage.promptTokens}`, 'gray')
      log(`  Completion tokens: ${data.data.usage.completionTokens}`, 'gray')
    }

    log(`\nInteraction ID: ${data.data.interactionId}`, 'gray')

  } catch (error) {
    log(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red')
    process.exit(1)
  }
}

// Example: Using the API client in a Node.js application
class HawkingEdisonClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl = 'https://bknpldydmkzupsfagnva.supabase.co') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  async interact(input: string, options?: { provider?: string }) {
    const response = await fetch(`${this.baseUrl}/functions/v1/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input,
        provider: options?.provider,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`API Error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.data
  }

  async addKnowledge(content: string, url: string, metadata?: any) {
    const response = await fetch(`${this.baseUrl}/functions/v1/databank/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ content, url, metadata }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`API Error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.data
  }

  async searchKnowledge(query: string, limit = 10) {
    const response = await fetch(`${this.baseUrl}/functions/v1/databank/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ query, limit }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`API Error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.data
  }

  async saveMemory(streamName: string, content: any, interactionId?: string) {
    const response = await fetch(`${this.baseUrl}/functions/v1/memories/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ streamName, content, interactionId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`API Error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.data
  }
}

// If running as CLI
if (require.main === module) {
  const input = process.argv.slice(2).join(' ')
  
  if (!input) {
    log('Usage: tsx utils/example-api-client.ts "Your question here"', 'yellow')
    log('Example: tsx utils/example-api-client.ts "What is the capital of France?"', 'gray')
    process.exit(1)
  }

  callHawkingEdison(input)
}

// Export for use as module
export { HawkingEdisonClient }