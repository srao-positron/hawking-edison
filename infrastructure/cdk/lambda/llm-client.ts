/**
 * LLM Client for Lambda Functions
 * Supports Claude (via Anthropic API) and OpenAI with function calling
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION })

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  toolCalls?: ToolCall[]
  toolCallId?: string
}

export interface ToolCall {
  id: string
  name: string
  arguments: any
}

export interface Tool {
  name: string
  description: string
  parameters?: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export interface LLMResponse {
  content?: string
  toolCalls?: ToolCall[]
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

let apiKeys: { anthropic?: string; openai?: string } | null = null

async function getApiKeys() {
  if (!apiKeys) {
    const command = new GetSecretValueCommand({
      SecretId: 'hawking-edison/api-keys'
    })
    
    const response = await secretsManager.send(command)
    const secrets = JSON.parse(response.SecretString || '{}')
    
    apiKeys = {
      anthropic: secrets.ANTHROPIC_API_KEY,
      openai: secrets.OPENAI_API_KEY
    }
  }
  
  return apiKeys
}

export async function callLLMWithTools(
  messages: LLMMessage[],
  tools: Tool[],
  provider: 'claude' | 'openai' = 'claude'
): Promise<LLMResponse> {
  const keys = await getApiKeys()
  
  if (provider === 'claude' && keys.anthropic) {
    return callClaudeWithTools(messages, tools, keys.anthropic)
  } else if (provider === 'openai' && keys.openai) {
    return callOpenAIWithTools(messages, tools, keys.openai)
  } else {
    throw new Error(`No API key available for provider: ${provider}`)
  }
}

async function callClaudeWithTools(
  messages: LLMMessage[],
  tools: Tool[],
  apiKey: string
): Promise<LLMResponse> {
  // Convert messages to Claude format
  const systemMessage = messages.find(m => m.role === 'system')?.content || ''
  const conversationMessages = messages.filter(m => m.role !== 'system')
  
  // Convert tools to Claude format
  const claudeTools = tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters || {
      type: 'object',
      properties: {},
      required: []
    }
  }))
  
  // Log the request
  console.log('=== CLAUDE API REQUEST ===')
  console.log('Model: claude-opus-4-20250514')
  console.log('System:', systemMessage.substring(0, 200) + '...')
  console.log('Messages:', conversationMessages.length)
  console.log('Last message role:', conversationMessages[conversationMessages.length - 1]?.role)
  console.log('Tools:', tools.length)
  
  const requestBody = {
    model: 'claude-opus-4-20250514', // Using Claude 4 Opus
    system: systemMessage,
    messages: conversationMessages.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: msg.toolCallId,
            content: msg.content
          }]
        }
      }
      
      if (msg.toolCalls) {
        return {
          role: 'assistant',
          content: msg.toolCalls.map(tc => ({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments
          }))
        }
      }
      
      return {
        role: msg.role,
        content: msg.content
      }
    }),
    tools: claudeTools,
    max_tokens: 4096
  }
  
  console.log('Request body:', JSON.stringify(requestBody, null, 2))
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(requestBody)
  })
  
  const responseText = await response.text()
  console.log('=== CLAUDE API RESPONSE ===')
  console.log('Status:', response.status)
  console.log('Response:', responseText.substring(0, 500) + '...')
  
  if (!response.ok) {
    throw new Error(`Claude API error: ${responseText}`)
  }
  
  const data = JSON.parse(responseText) as any
  
  // Parse response
  const result: LLMResponse = {
    usage: {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens
    }
  }
  
  // Check if Claude wants to use tools
  const toolUses = data.content.filter((c: any) => c.type === 'tool_use')
  const textContent = data.content.filter((c: any) => c.type === 'text')
  
  if (toolUses.length > 0) {
    result.toolCalls = toolUses.map((tu: any) => ({
      id: tu.id,
      name: tu.name,
      arguments: tu.input
    }))
  }
  
  if (textContent.length > 0) {
    result.content = textContent.map((tc: any) => tc.text).join('\n')
  }
  
  return result
}

async function callOpenAIWithTools(
  messages: LLMMessage[],
  tools: Tool[],
  apiKey: string
): Promise<LLMResponse> {
  // Convert messages to OpenAI format
  const openAIMessages = messages.map(msg => {
    if (msg.role === 'tool') {
      return {
        role: 'tool' as const,
        tool_call_id: msg.toolCallId,
        content: msg.content
      }
    }
    
    if (msg.toolCalls) {
      return {
        role: 'assistant' as const,
        content: null,
        tool_calls: msg.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments)
          }
        }))
      }
    }
    
    return {
      role: msg.role,
      content: msg.content
    }
  })
  
  // Convert tools to OpenAI format
  const openAITools = tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters || {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }))
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: openAIMessages,
      tools: openAITools,
      tool_choice: 'auto'
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }
  
  const data = await response.json() as any
  const choice = data.choices[0]
  
  const result: LLMResponse = {
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens
    }
  }
  
  if (choice.message.tool_calls) {
    result.toolCalls = choice.message.tool_calls.map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments)
    }))
  }
  
  if (choice.message.content) {
    result.content = choice.message.content
  }
  
  return result
}