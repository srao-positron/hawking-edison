/**
 * Thread Search Tool for Lambda Orchestrator
 * 
 * Allows searching through historical thread messages,
 * especially useful when context has been compressed.
 */

import { ToolDefinition, ToolExecutionContext } from './index'

// Search through thread history
export const searchThreadHistory: ToolDefinition = {
  name: 'searchThreadHistory',
  description: 'Search through the complete history of the current thread, including messages that may have been compressed or removed from the active context',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query to find in thread history (searches message content)'
      },
      messageRole: {
        type: 'string',
        description: 'Filter by message role',
        enum: ['user', 'assistant', 'all']
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return',
        default: 10
      }
    },
    required: ['query']
  },
  execute: async (params: any, context: ToolExecutionContext) => {
    const { query, messageRole = 'all', limit = 10 } = params
    const threadId = context.sessionId // This is the orchestration session ID
    
    try {
      // Get the actual thread ID from the orchestration session
      const { data: session, error: sessionError } = await context.supabase
        .from('orchestration_sessions')
        .select('tool_state')
        .eq('id', threadId)
        .single()
      
      if (sessionError || !session?.tool_state) {
        return {
          status: 'error',
          message: 'Could not find thread ID for this session'
        }
      }
      
      const toolState = session.tool_state as any
      if (!toolState.thread_id) {
        return {
          status: 'error',
          message: 'No thread ID found in session'
        }
      }
      
      const actualThreadId = toolState.thread_id as string
      
      // Search through chat messages
      let messagesQuery = context.supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', actualThreadId)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      // Apply role filter if specified
      if (messageRole !== 'all') {
        messagesQuery = messagesQuery.eq('role', messageRole)
      }
      
      const { data: messages, error: messagesError } = await messagesQuery
      
      if (messagesError) {
        return {
          status: 'error',
          message: `Failed to search thread history: ${messagesError.message}`
        }
      }
      
      return {
        status: 'success',
        threadId: actualThreadId,
        query,
        resultCount: messages?.length || 0,
        messages: messages?.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at,
          excerpt: getExcerpt(msg.content as string, query)
        })) || []
      }
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error searching thread history'
      }
    }
  }
}

// Get excerpt around the search query
function getExcerpt(content: string, query: string, contextLength: number = 100): string {
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerContent.indexOf(lowerQuery)
  
  if (index === -1) return content.substring(0, 200) + '...'
  
  const start = Math.max(0, index - contextLength)
  const end = Math.min(content.length, index + query.length + contextLength)
  
  let excerpt = content.substring(start, end)
  if (start > 0) excerpt = '...' + excerpt
  if (end < content.length) excerpt = excerpt + '...'
  
  return excerpt
}

// Get thread summary for context
export const getThreadSummary: ToolDefinition = {
  name: 'getThreadSummary',
  description: 'Get a summary of the entire thread conversation, including message count and key topics',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async (params: any, context: ToolExecutionContext) => {
    try {
      // Get the actual thread ID from the orchestration session
      const { data: session, error: sessionError } = await context.supabase
        .from('orchestration_sessions')
        .select('tool_state')
        .eq('id', context.sessionId)
        .single()
      
      if (sessionError || !session?.tool_state) {
        return {
          status: 'error',
          message: 'Could not find thread ID for this session'
        }
      }
      
      const toolState = session.tool_state as any
      if (!toolState.thread_id) {
        return {
          status: 'error',
          message: 'No thread ID found in session'
        }
      }
      
      const threadId = toolState.thread_id as string
      
      // Get thread info
      const { data: thread, error: threadError } = await context.supabase
        .from('chat_threads')
        .select('*')
        .eq('id', threadId)
        .single()
      
      if (threadError) {
        return {
          status: 'error',
          message: `Failed to get thread info: ${threadError.message}`
        }
      }
      
      // Get message statistics
      const { data: messages, error: messagesError } = await context.supabase
        .from('chat_messages')
        .select('role, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
      
      if (messagesError) {
        return {
          status: 'error',
          message: `Failed to get messages: ${messagesError.message}`
        }
      }
      
      const userMessageCount = messages?.filter(m => m.role === 'user').length || 0
      const assistantMessageCount = messages?.filter(m => m.role === 'assistant').length || 0
      const firstMessageTime = messages?.[0]?.created_at as string | undefined
      const lastMessageTime = messages?.[messages.length - 1]?.created_at as string | undefined
      
      return {
        status: 'success',
        threadId,
        title: thread.title,
        created: thread.created_at,
        totalMessages: messages?.length || 0,
        userMessages: userMessageCount,
        assistantMessages: assistantMessageCount,
        conversationDuration: firstMessageTime && lastMessageTime ? 
          `${Math.round((new Date(lastMessageTime).getTime() - new Date(firstMessageTime).getTime()) / 1000 / 60)} minutes` : 
          'Unknown',
        metadata: thread.metadata
      }
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error getting thread summary'
      }
    }
  }
}