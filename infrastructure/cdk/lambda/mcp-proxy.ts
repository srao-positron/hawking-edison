import { SupabaseClient } from '@supabase/supabase-js'

interface MCPServer {
  id: string
  name: string
  type: 'http' | 'websocket' | 'stdio'
  url?: string
  config: any
  is_oauth: boolean
  oauth_provider?: string
}

interface MCPTool {
  id: string
  mcp_server_id: string
  name: string
  description?: string
  schema: any
  category?: string
}

interface MCPExecutionLog {
  session_id: string
  thread_id?: string
  mcp_server_id: string
  tool_name: string
  request: any
  response?: any
  status: 'pending' | 'success' | 'error' | 'timeout'
  error?: string
  duration_ms?: number
}

export class MCPProxy {
  constructor(
    private supabase: SupabaseClient,
    private sessionId: string,
    private threadId?: string
  ) {}

  /**
   * Get available MCP tools for a user
   */
  async getAvailableTools(userId: string): Promise<MCPTool[]> {
    // Get active MCP servers for the user
    const { data: servers, error: serversError } = await this.supabase
      .from('mcp_servers')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (serversError || !servers || servers.length === 0) {
      return []
    }

    // Get tools for all active servers
    const serverIds = servers.map(s => s.id)
    const { data: tools, error: toolsError } = await this.supabase
      .from('mcp_tools')
      .select('*')
      .in('mcp_server_id', serverIds)

    if (toolsError || !tools) {
      console.error('Failed to fetch MCP tools:', toolsError)
      return []
    }

    return tools
  }

  /**
   * Execute an MCP tool
   */
  async executeTool(
    userId: string,
    toolName: string,
    parameters: any
  ): Promise<any> {
    const startTime = Date.now()
    
    try {
      // Find the tool
      const { data: tool, error: toolError } = await this.supabase
        .from('mcp_tools')
        .select('*')
        .eq('name', toolName)
        .single()

      if (toolError || !tool) {
        throw new Error(`MCP tool not found: ${toolName}`)
      }
      
      // Get the server
      const { data: server, error: serverError } = await this.supabase
        .from('mcp_servers')
        .select('*')
        .eq('id', tool.mcp_server_id)
        .single()
        
      if (serverError || !server) {
        throw new Error(`MCP server not found for tool: ${toolName}`)
      }
      
      // Verify the server belongs to the user
      if (server.user_id !== userId) {
        throw new Error('Unauthorized access to MCP tool')
      }

      // Log the execution start
      const { data: logEntry } = await this.supabase
        .from('mcp_execution_logs')
        .insert({
          session_id: this.sessionId,
          thread_id: this.threadId,
          mcp_server_id: server.id,
          tool_name: toolName,
          request: parameters,
          status: 'pending'
        })
        .select()
        .single()
      
      // Also log as orchestration event
      await this.supabase.rpc('log_orchestration_event', {
        p_session_id: this.sessionId,
        p_event_type: 'tool_call',
        p_event_data: {
          tool: `mcp_${toolName}`,
          arguments: parameters,
          mcp_server_id: server.id,
          mcp_server_name: server.name
        }
      })

      // Get OAuth token if needed
      let headers = { ...server.config.servers[Object.keys(server.config.servers)[0]].headers }
      
      if (server.is_oauth) {
        const { data: token, error: tokenError } = await this.supabase
          .from('mcp_oauth_tokens')
          .select('access_token, expires_at')
          .eq('mcp_server_id', server.id)
          .single()

        if (tokenError || !token) {
          throw new Error('OAuth token not found')
        }

        // Check if token is expired
        if (token.expires_at && new Date(token.expires_at) < new Date()) {
          throw new Error('OAuth token expired')
        }

        headers['Authorization'] = `Bearer ${token.access_token}`
      }

      // Execute the tool via JSON-RPC
      const baseUrl = server.config.servers[Object.keys(server.config.servers)[0]].url
      
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: `tools/call`,
          params: {
            name: toolName,
            arguments: parameters
          },
          id: Date.now()
        })
      })

      const responseData = await response.json()
      const duration = Date.now() - startTime

      // Check for JSON-RPC error
      if (responseData.error) {
        await this.supabase
          .from('mcp_execution_logs')
          .update({
            response: responseData,
            status: 'error',
            error: responseData.error.message,
            duration_ms: duration
          })
          .eq('id', logEntry.id)

        throw new Error(`MCP tool error: ${responseData.error.message}`)
      }

      // Success - update log
      await this.supabase
        .from('mcp_execution_logs')
        .update({
          response: responseData.result,
          status: 'success',
          duration_ms: duration
        })
        .eq('id', logEntry.id)
      
      // Log success as orchestration event
      await this.supabase.rpc('log_orchestration_event', {
        p_session_id: this.sessionId,
        p_event_type: 'tool_result',
        p_event_data: {
          tool: `mcp_${toolName}`,
          result: responseData.result,
          duration_ms: duration,
          mcp_server_id: server.id,
          mcp_server_name: server.name
        }
      })

      return responseData.result
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Log error if we have a log entry
      if (error instanceof Error) {
        console.error(`MCP tool execution failed: ${error.message}`)
      }
      
      throw error
    }
  }

  /**
   * Get execution history for the current session
   */
  async getExecutionHistory(): Promise<MCPExecutionLog[]> {
    const { data, error } = await this.supabase
      .from('mcp_execution_logs')
      .select('*')
      .eq('session_id', this.sessionId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch execution history:', error)
      return []
    }

    return data || []
  }

  /**
   * Format MCP tools for the orchestrator's tool registry
   */
  static formatToolsForRegistry(tools: MCPTool[]): Record<string, any> {
    const registry: Record<string, any> = {}
    
    tools.forEach(tool => {
      registry[`mcp_${tool.name}`] = {
        name: `mcp_${tool.name}`,
        description: tool.description || `MCP tool: ${tool.name}`,
        parameters: tool.schema || {},
        category: 'mcp',
        metadata: {
          mcp_server_id: tool.mcp_server_id,
          original_name: tool.name,
          category: tool.category
        }
      }
    })
    
    return registry
  }
}