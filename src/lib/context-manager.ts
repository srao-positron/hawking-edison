// Context Manager - Handles context window management and compaction
import { encoding_for_model, TiktokenModel } from '@dqbd/tiktoken'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
  tokens?: number
  importance?: number // 0-1, higher is more important
  timestamp?: Date
}

export interface ContextManagerOptions {
  maxTokens?: number
  model?: TiktokenModel
  preserveSystemPrompt?: boolean
  preserveRecentMessages?: number
  compressionThreshold?: number // % of max tokens before compression kicks in
}

export class ContextManager {
  private maxTokens: number
  private model: TiktokenModel
  private preserveSystemPrompt: boolean
  private preserveRecentMessages: number
  private compressionThreshold: number
  private encoder: any

  constructor(options: ContextManagerOptions = {}) {
    this.maxTokens = options.maxTokens ?? 100000 // Default for Claude 3
    this.model = options.model ?? 'gpt-4' // Tiktoken doesn't have Claude models
    this.preserveSystemPrompt = options.preserveSystemPrompt ?? true
    this.preserveRecentMessages = options.preserveRecentMessages ?? 5
    this.compressionThreshold = options.compressionThreshold ?? 0.8
    
    // Initialize encoder
    this.encoder = encoding_for_model(this.model)
  }

  // Count tokens in a message
  countTokens(text: string): number {
    try {
      return this.encoder.encode(text).length
    } catch (error) {
      // Fallback to rough estimation (4 chars per token)
      return Math.ceil(text.length / 4)
    }
  }

  // Count total tokens in messages
  countTotalTokens(messages: Message[]): number {
    return messages.reduce((total, msg) => {
      const tokens = msg.tokens || this.countTokens(msg.content)
      return total + tokens + 4 // Add 4 tokens for message formatting
    }, 0)
  }

  // Determine which messages to keep within token limit
  selectMessages(messages: Message[], currentTokens: number = 0): Message[] {
    const targetTokens = this.maxTokens - currentTokens
    const threshold = targetTokens * this.compressionThreshold

    // Calculate tokens for each message if not provided
    const messagesWithTokens = messages.map(msg => ({
      ...msg,
      tokens: msg.tokens || this.countTokens(msg.content)
    }))

    // If we're under threshold, return all messages
    const totalTokens = this.countTotalTokens(messagesWithTokens)
    if (totalTokens <= threshold) {
      return messagesWithTokens
    }

    // Otherwise, we need to compress
    const selected: Message[] = []
    let usedTokens = 0

    // Always preserve system prompt if requested
    if (this.preserveSystemPrompt) {
      const systemMessages = messagesWithTokens.filter(m => m.role === 'system')
      selected.push(...systemMessages)
      usedTokens += this.countTotalTokens(systemMessages)
    }

    // Always preserve recent messages
    const recentMessages = messagesWithTokens
      .slice(-this.preserveRecentMessages * 2) // Get last N exchanges
      .filter(m => m.role !== 'system')
    
    // Add recent messages
    selected.push(...recentMessages)
    usedTokens += this.countTotalTokens(recentMessages)

    // For the middle messages, prioritize by importance and recency
    const middleMessages = messagesWithTokens
      .slice(this.preserveSystemPrompt ? 1 : 0, -this.preserveRecentMessages * 2)
      .filter(m => m.role !== 'system')
      .sort((a, b) => {
        // Sort by importance first, then by recency
        const importanceA = a.importance ?? 0.5
        const importanceB = b.importance ?? 0.5
        if (importanceA !== importanceB) {
          return importanceB - importanceA
        }
        // If importance is equal, prefer more recent
        const timeA = a.timestamp?.getTime() ?? 0
        const timeB = b.timestamp?.getTime() ?? 0
        return timeB - timeA
      })

    // Add middle messages until we hit the threshold
    for (const msg of middleMessages) {
      const msgTokens = (msg.tokens || 0) + 4
      if (usedTokens + msgTokens <= threshold) {
        selected.push(msg)
        usedTokens += msgTokens
      } else {
        break
      }
    }

    // Sort selected messages back to chronological order
    return selected.sort((a, b) => {
      const timeA = a.timestamp?.getTime() ?? 0
      const timeB = b.timestamp?.getTime() ?? 0
      return timeA - timeB
    })
  }

  // Summarize a conversation segment
  async summarizeSegment(messages: Message[]): Promise<string> {
    // This would call an LLM to summarize, but for now return a placeholder
    const messageCount = messages.length
    const userMessages = messages.filter(m => m.role === 'user').length
    const assistantMessages = messages.filter(m => m.role === 'assistant').length
    
    return `[Summary of ${messageCount} messages: ${userMessages} user messages and ${assistantMessages} assistant responses discussing the topic]`
  }

  // Compress messages by summarizing older segments
  async compressMessages(messages: Message[]): Promise<Message[]> {
    const messagesWithTokens = messages.map(msg => ({
      ...msg,
      tokens: msg.tokens || this.countTokens(msg.content)
    }))

    // Find the cutoff point for messages to summarize
    const totalTokens = this.countTotalTokens(messagesWithTokens)
    const targetTokens = this.maxTokens * this.compressionThreshold
    
    if (totalTokens <= targetTokens) {
      return messagesWithTokens
    }

    // Keep system messages and recent messages
    const systemMessages = messagesWithTokens.filter(m => m.role === 'system')
    const nonSystemMessages = messagesWithTokens.filter(m => m.role !== 'system')
    const recentMessages = nonSystemMessages.slice(-this.preserveRecentMessages * 2)
    const olderMessages = nonSystemMessages.slice(0, -this.preserveRecentMessages * 2)

    // Summarize older messages in chunks
    const compressed: Message[] = [...systemMessages]
    
    if (olderMessages.length > 0) {
      // Group messages into conversation segments (user + assistant pairs)
      const segments: Message[][] = []
      let currentSegment: Message[] = []
      
      for (const msg of olderMessages) {
        currentSegment.push(msg)
        if (msg.role === 'assistant' && currentSegment.length >= 2) {
          segments.push([...currentSegment])
          currentSegment = []
        }
      }
      
      if (currentSegment.length > 0) {
        segments.push(currentSegment)
      }

      // Summarize segments
      for (const segment of segments) {
        const summary = await this.summarizeSegment(segment)
        compressed.push({
          role: 'system',
          content: summary,
          tokens: this.countTokens(summary),
          importance: 0.7,
          timestamp: segment[0].timestamp
        })
      }
    }

    // Add recent messages
    compressed.push(...recentMessages)

    return compressed
  }

  // Clean up encoder when done
  dispose() {
    if (this.encoder && this.encoder.free) {
      this.encoder.free()
    }
  }
}

// Export singleton instance with default configuration
export const contextManager = new ContextManager({
  maxTokens: 100000, // Claude 3 Opus context window
  preserveSystemPrompt: true,
  preserveRecentMessages: 10,
  compressionThreshold: 0.8
})