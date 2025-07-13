import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { verifyAuth } from '../_shared/auth.ts'
import { createResponse, createErrorResponse } from '../_shared/response.ts'

interface MCPListToolsResponse {
  tools: Array<{
    name: string
    description?: string
    inputSchema?: any
  }>
}

interface MCPListDataSourcesResponse {
  resources?: Array<{
    name: string
    description?: string
    uri?: string
    mimeType?: string
  }>
  // Backwards compatibility
  dataSources?: Array<{
    name: string
    description?: string
    schema?: any
  }>
}

async function processEnumeration(serverId: string, userId: string) {
  // Initialize Supabase with service role
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get MCP server configuration
  const { data: server, error: serverError } = await supabase
    .from('mcp_servers')
    .select('*')
    .eq('id', serverId)
    .eq('user_id', userId)
    .single()

  if (serverError || !server) {
    throw new Error('MCP server not found')
  }

  // Get OAuth token if needed
  let headers = { ...server.config.servers[Object.keys(server.config.servers)[0]].headers }
  
  if (server.is_oauth) {
    const { data: token, error: tokenError } = await supabase
      .from('mcp_oauth_tokens')
      .select('access_token')
      .eq('mcp_server_id', serverId)
      .single()

    if (tokenError || !token) {
      throw new Error('OAuth token not found')
    }

    // Replace token placeholder if exists
    headers['Authorization'] = `Bearer ${token.access_token}`
  }

  const baseUrl = server.config.servers[Object.keys(server.config.servers)[0]].url

  console.log(`[MCP] Enumerating tools for server ${server.name}`)

  // List tools using JSON-RPC format
  try {
    const toolsResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1
      })
    })

    if (toolsResponse.ok) {
      const responseData = await toolsResponse.json()
      
      // Check for JSON-RPC error
      if (responseData.error) {
        console.error('JSON-RPC error:', responseData.error)
        throw new Error(responseData.error.message)
      }
      
      const toolsData: MCPListToolsResponse = responseData.result
      
      // Clear existing tools
      await supabase
        .from('mcp_tools')
        .delete()
        .eq('mcp_server_id', serverId)

      // Insert new tools
      if (toolsData.tools && toolsData.tools.length > 0) {
        const toolsToInsert = toolsData.tools.map(tool => ({
          mcp_server_id: serverId,
          name: tool.name,
          description: tool.description || null,
          schema: tool.inputSchema || {},
          category: categorizeTools(tool.name),
          metadata: {}
        }))

        const { error: insertError } = await supabase
          .from('mcp_tools')
          .insert(toolsToInsert)

        if (insertError) {
          console.error('Failed to insert tools:', insertError)
        } else {
          console.log(`[MCP] Inserted ${toolsToInsert.length} tools`)
        }
      }
    } else {
      console.error('Failed to list tools:', await toolsResponse.text())
    }
  } catch (error) {
    console.error('Error listing tools:', error)
  }

  // List data sources using JSON-RPC format
  try {
    const dataSourcesResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'resources/list',
        params: {},
        id: 2
      })
    })

    if (dataSourcesResponse.ok) {
      const responseData = await dataSourcesResponse.json()
      
      // Check for JSON-RPC error
      if (responseData.error) {
        console.error('JSON-RPC error for data sources:', responseData.error)
        // Don't throw here, data sources might not be supported
      } else if (responseData.result) {
        const dataSourcesData: MCPListDataSourcesResponse = responseData.result
        
        // Clear existing data sources
        await supabase
          .from('mcp_data_sources')
          .delete()
          .eq('mcp_server_id', serverId)

        // Insert new data sources (handle both resources and dataSources)
        const resources = dataSourcesData.resources || dataSourcesData.dataSources || []
        if (resources.length > 0) {
          const sourcesToInsert = resources.map((source: any) => ({
            mcp_server_id: serverId,
            name: source.name,
            description: source.description || null,
            schema: source.schema || source.uri ? { uri: source.uri, mimeType: source.mimeType } : null,
            metadata: {}
          }))

          const { error: insertError } = await supabase
            .from('mcp_data_sources')
            .insert(sourcesToInsert)

          if (insertError) {
            console.error('Failed to insert data sources:', insertError)
          } else {
            console.log(`[MCP] Inserted ${sourcesToInsert.length} data sources`)
          }
        }
      }
    } else {
      console.error('Failed to list data sources:', await dataSourcesResponse.text())
    }
  } catch (error) {
    console.error('Error listing data sources:', error)
  }

  // Update server status
  await supabase
    .from('mcp_servers')
    .update({
      last_connected_at: new Date().toISOString(),
      connection_error: null
    })
    .eq('id', serverId)
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if this is a service role request
    const authHeader = req.headers.get('Authorization')
    const isServiceRole = authHeader === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    
    let user: any
    
    if (isServiceRole) {
      // For service role, expect user info in request body
      const body = await req.json()
      const { serverId, user: providedUser } = body
      
      if (!providedUser?.id) {
        return createErrorResponse('INVALID_REQUEST', 'User ID required for service role requests')
      }
      
      user = providedUser
      
      // Continue with serverId from body
      if (!serverId) {
        return createErrorResponse('INVALID_REQUEST', 'Server ID required')
      }
      
      // Process request with provided data
      await processEnumeration(serverId, user.id)
      
      return createResponse({
        success: true,
        serverId,
        message: 'Tool enumeration completed'
      })
    } else {
      // Regular authentication flow
      const { error: authError, user: authUser } = await verifyAuth(req)
      if (authError) {
        return authError
      }
      user = authUser

      // Parse request
      const { serverId } = await req.json()
      
      if (!serverId) {
        return createErrorResponse('INVALID_REQUEST', 'Server ID required')
      }

      // Process enumeration
      await processEnumeration(serverId, user!.id)

      return createResponse({
        success: true,
        serverId,
        message: 'Tool enumeration completed'
      })
    }

  } catch (error) {
    console.error('MCP enumeration error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
})

function categorizeTools(toolName: string): string {
  // Categorize based on tool name patterns
  if (toolName.includes('search') || toolName.includes('find')) return 'search'
  if (toolName.includes('read') || toolName.includes('get')) return 'read'
  if (toolName.includes('write') || toolName.includes('create') || toolName.includes('update')) return 'write'
  if (toolName.includes('delete') || toolName.includes('remove')) return 'delete'
  if (toolName.includes('analyze') || toolName.includes('process')) return 'analyze'
  return 'other'
}