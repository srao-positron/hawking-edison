// LLM Provider abstraction - Claude Opus 4 default, with OpenAI options

export enum LLMProvider {
  CLAUDE_OPUS_4 = 'claude-opus-4',
  OPENAI_GPT_4_1 = 'gpt-4.1',
  OPENAI_GPT_4O = 'gpt-4o',
  CLAUDE_SONNET = 'claude-3-5-sonnet-latest'
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMOptions {
  temperature?: number
  maxTokens?: number
  provider?: LLMProvider
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

class LLMClient {
  private anthropicApiKey: string
  private openaiApiKey: string

  constructor() {
    this.anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY') || ''
    this.openaiApiKey = Deno.env.get('OPENAI_API_KEY') || ''
  }

  async complete(
    messages: LLMMessage[],
    options: LLMOptions = {}
  ): Promise<LLMResponse> {
    const provider = options.provider || LLMProvider.CLAUDE_OPUS_4
    
    if (provider === LLMProvider.CLAUDE_OPUS_4 || provider === LLMProvider.CLAUDE_SONNET) {
      return this.completeWithAnthropic(messages, options, provider)
    } else {
      return this.completeWithOpenAI(messages, options, provider)
    }
  }

  private async completeWithAnthropic(
    messages: LLMMessage[],
    options: LLMOptions,
    provider: LLMProvider
  ): Promise<LLMResponse> {
    if (!this.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    // Convert messages to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system')?.content || ''
    const userMessages = messages.filter(m => m.role !== 'system')

    const model = provider === LLMProvider.CLAUDE_OPUS_4 
      ? 'claude-3-opus-20240229'  // Update when Opus 4 is available
      : 'claude-3-5-sonnet-20241022'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        system: systemMessage,
        messages: userMessages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${error}`)
    }

    const data = await response.json()
    
    return {
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      }
    }
  }

  private async completeWithOpenAI(
    messages: LLMMessage[],
    options: LLMOptions,
    provider: LLMProvider
  ): Promise<LLMResponse> {
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const model = provider === LLMProvider.OPENAI_GPT_4_1 
      ? 'gpt-4-turbo-preview'  // Update when GPT-4.1 is available
      : 'gpt-4o'

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      }
    }
  }
}

export const llm = new LLMClient()