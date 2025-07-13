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
  dataSources: Array<{
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

  // List tools
  try {
    const toolsResponse = await fetch(`${baseUrl}tools/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({})
    })

    if (toolsResponse.ok) {
      const toolsData: MCPListToolsResponse = await toolsResponse.json()
      
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

  // List data sources
  try {
    const dataSourcesResponse = await fetch(`${baseUrl}datasources/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({})
    })

    if (dataSourcesResponse.ok) {
      const dataSourcesData: MCPListDataSourcesResponse = await dataSourcesResponse.json()
      
      // Clear existing data sources
      await supabase
        .from('mcp_data_sources')
        .delete()
        .eq('mcp_server_id', serverId)

      // Insert new data sources
      if (dataSourcesData.dataSources && dataSourcesData.dataSources.length > 0) {
        const sourcesToInsert = dataSourcesData.dataSources.map(source => ({
          mcp_server_id: serverId,
          name: source.name,
          description: source.description || null,
          schema: source.schema || null,
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