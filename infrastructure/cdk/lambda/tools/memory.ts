/**
 * Memory Tools for Lambda Orchestrator
 * 
 * Enable agents to have memory across interactions.
 * Memory is optional and controlled by the LLM orchestrator.
 */

import { ToolDefinition, ToolExecutionContext } from './index'
import { callLLMWithTools } from '../llm-client'

export const memoryTools: ToolDefinition[] = [
  {
    name: 'giveAgentMemory',
    description: 'Give an agent memory of previous interactions. The agent will have context from past conversations.',
    parameters: {
      type: 'object',
      properties: {
        agent: {
          type: 'object',
          description: 'The agent to give memory to'
        },
        memoryKey: {
          type: 'string',
          description: 'Unique identifier for this memory stream (e.g., "sarah-analyst-project-alpha")'
        },
        scope: {
          type: 'string',
          description: 'What memories to include (recent, all, specific-topic)',
          default: 'all'
        }
      },
      required: ['agent', 'memoryKey']
    },
    execute: async (
      args: { agent: any; memoryKey: string; scope?: string },
      context: ToolExecutionContext
    ) => {
      const { agent, memoryKey, scope = 'all' } = args
      
      // Fetch memories from database
      let query = context.supabase
        .from('agent_memories')
        .select('*')
        .eq('user_id', context.userId)
        .eq('memory_key', memoryKey)
        .order('created_at', { ascending: false })
      
      // Apply scope filters
      if (scope === 'recent') {
        query = query.limit(10)
      } else if (scope !== 'all') {
        // For semantic search, we'll use the main query and filter
        // In production, this would use the RPC function for vector search
        query = query.limit(20)
      }
      
      const { data: memories, error } = await query
      
      if (error) {
        console.error('Error fetching memories:', error)
        return {
          ...agent,
          memoryContext: {
            error: 'Failed to load memories',
            memoryKey
          }
        }
      }
      
      // Enhance agent with memory context
      const memoryContext: any = {
        memoryKey,
        scope,
        memories: memories || [],
        instruction: `You have access to ${memories?.length || 0} previous interactions. Use this context to maintain continuity and build on past discussions.`
      }
      
      // Add memory summary to agent
      if (memories && memories.length > 0) {
        const summaryResponse = await callLLMWithTools(
          [
            {
              role: 'system',
              content: 'Summarize these memories into key points the agent should remember.'
            },
            {
              role: 'user',
              content: `Memories for ${agent.name || agent.id}:\n${JSON.stringify(memories, null, 2)}`
            }
          ],
          [],
          'claude'
        )
        
        memoryContext.summary = summaryResponse.content
      }
      
      return {
        ...agent,
        memoryContext,
        hasMemory: true
      }
    }
  },
  
  {
    name: 'saveAgentMemory',
    description: 'Save an interaction or insight for future recall',
    parameters: {
      type: 'object',
      properties: {
        memoryKey: {
          type: 'string',
          description: 'Where to store this memory (e.g., "project-alpha-discussions")'
        },
        content: {
          type: 'any',
          description: 'What to remember (discussion, insights, decisions, etc)'
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata about this memory'
        }
      },
      required: ['memoryKey', 'content']
    },
    execute: async (
      args: { memoryKey: string; content: any; metadata?: any },
      context: ToolExecutionContext
    ) => {
      const { memoryKey, content, metadata } = args
      
      // Generate embedding for semantic search
      const contentString = JSON.stringify(content)
      const embedding = await generateEmbedding(contentString)
      
      // Save to database
      const { data, error } = await context.supabase
        .from('agent_memories')
        .insert({
          user_id: context.userId,
          memory_key: memoryKey,
          content: content,
          embedding: embedding,
          metadata: metadata || {},
          session_id: context.sessionId,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error saving memory:', error)
        return {
          success: false,
          error: 'Failed to save memory',
          memoryKey
        }
      }
      
      return {
        success: true,
        memoryId: data.id,
        memoryKey,
        savedAt: data.created_at
      }
    }
  },
  
  {
    name: 'searchMemories',
    description: 'Search across all saved memories semantically',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'What to search for'
        },
        memoryKeys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: search only specific memory streams'
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return',
          default: 10
        }
      },
      required: ['query']
    },
    execute: async (
      args: { query: string; memoryKeys?: string[]; limit?: number },
      context: ToolExecutionContext
    ) => {
      const { query, memoryKeys, limit = 10 } = args
      
      // Generate embedding for search
      const embedding = await generateEmbedding(query)
      
      // For now, do a simple search without vector similarity
      // In production, this would use the RPC function with vector embeddings
      let searchQuery = context.supabase
        .from('agent_memories')
        .select('*')
        .eq('user_id', context.userId)
        .limit(limit)
      
      if (memoryKeys && memoryKeys.length > 0) {
        searchQuery = searchQuery.in('memory_key', memoryKeys)
      }
      
      const { data: memories, error } = await searchQuery
      
      if (error) {
        console.error('Error searching memories:', error)
        return {
          results: [],
          error: 'Failed to search memories'
        }
      }
      
      return {
        query,
        results: memories || [],
        count: memories?.length || 0,
        searchedAt: new Date().toISOString()
      }
    }
  },
  
  {
    name: 'listMemoryStreams',
    description: 'List all available memory streams/conversations',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Optional pattern to filter streams'
        }
      }
    },
    execute: async (
      args: { pattern?: string },
      context: ToolExecutionContext
    ) => {
      const { pattern } = args
      
      // Get unique memory keys
      let query = context.supabase
        .from('agent_memories')
        .select('memory_key, count, metadata, created_at')
        .eq('user_id', context.userId)
      
      if (pattern) {
        query = query.ilike('memory_key', `%${pattern}%`)
      }
      
      // For now, do a simple group by query
      // In production, this would use the RPC function
      const { data: memories, error: memError } = await context.supabase
        .from('agent_memories')
        .select('memory_key')
        .eq('user_id', context.userId)
      
      if (memError) {
        console.error('Error listing memory streams:', memError)
        return {
          streams: [],
          error: 'Failed to list memory streams'
        }
      }
      
      // Group by memory_key
      const streamMap = new Map<string, number>()
      memories?.forEach((m: any) => {
        const key = m.memory_key as string
        streamMap.set(key, (streamMap.get(key) || 0) + 1)
      })
      
      // Convert to array and filter by pattern
      let streams = Array.from(streamMap.entries()).map(([key, count]) => ({
        memory_key: key,
        memory_count: count
      }))
      
      if (pattern) {
        streams = streams.filter(s => s.memory_key.includes(pattern))
      }
      
      const data = streams
      
      return {
        streams: data || [],
        count: data?.length || 0,
        pattern
      }
    }
  },
  
  {
    name: 'forgetMemory',
    description: 'Delete specific memories or entire memory streams',
    parameters: {
      type: 'object',
      properties: {
        memoryKey: {
          type: 'string',
          description: 'Memory stream to forget'
        },
        beforeDate: {
          type: 'string',
          description: 'Optional: only forget memories before this date'
        }
      },
      required: ['memoryKey']
    },
    execute: async (
      args: { memoryKey: string; beforeDate?: string },
      context: ToolExecutionContext
    ) => {
      const { memoryKey, beforeDate } = args
      
      let query = context.supabase
        .from('agent_memories')
        .delete()
        .eq('user_id', context.userId)
        .eq('memory_key', memoryKey)
      
      if (beforeDate) {
        query = query.lt('created_at', beforeDate)
      }
      
      const { error, count } = await query
      
      if (error) {
        console.error('Error deleting memories:', error)
        return {
          success: false,
          error: 'Failed to delete memories',
          memoryKey
        }
      }
      
      return {
        success: true,
        memoryKey,
        deletedCount: count || 0,
        beforeDate
      }
    }
  }
]

/**
 * Generate embedding for a text using the LLM
 * In production, this would use a dedicated embedding model
 */
async function generateEmbedding(text: string): Promise<number[]> {
  // For now, return a mock embedding
  // In production, use OpenAI embeddings or similar
  const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return Array(1536).fill(0).map((_, i) => Math.sin(hash + i) * 0.1)
}