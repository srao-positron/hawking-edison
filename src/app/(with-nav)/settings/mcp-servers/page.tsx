'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase-browser'
import { 
  Plus, 
  Server, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  Edit,
  TestTube,
  Github,
  Key,
  ExternalLink
} from 'lucide-react'

interface MCPServer {
  id: string
  name: string
  type: 'http' | 'websocket' | 'stdio'
  url?: string
  config: any
  is_active: boolean
  is_oauth: boolean
  oauth_provider?: string
  last_connected_at?: string
  connection_error?: string
  created_at: string
  tools_count?: number
  data_sources_count?: number
}

export default function MCPServersPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [servers, setServers] = useState<MCPServer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    } else if (user) {
      loadServers()
    }
  }, [user, loading])

  const loadServers = async () => {
    const supabase = getBrowserClient()
    
    try {
      // Load MCP servers
      const { data: serversData, error } = await supabase
        .from('mcp_servers')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Load tool and data source counts separately
      const serverIds = serversData?.map(s => s.id) || []
      
      const processedServers = await Promise.all(
        (serversData || []).map(async (server) => {
          const [toolsResult, dataSourcesResult] = await Promise.all([
            supabase
              .from('mcp_tools')
              .select('*', { count: 'exact', head: true })
              .eq('mcp_server_id', server.id),
            supabase
              .from('mcp_data_sources')
              .select('*', { count: 'exact', head: true })
              .eq('mcp_server_id', server.id)
          ])

          return {
            ...server,
            tools_count: toolsResult.count || 0,
            data_sources_count: dataSourcesResult.count || 0
          }
        })
      )

      setServers(processedServers)
    } catch (error) {
      console.error('Failed to load MCP servers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectGitHub = () => {
    // Initiate GitHub OAuth flow
    const githubOAuthUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/github-mcp/callback')}` +
      `&scope=repo,read:user` +
      `&state=${crypto.randomUUID()}`
    
    window.location.href = githubOAuthUrl
  }

  const handleTestConnection = async (server: MCPServer) => {
    // Test MCP server connection
    console.log('Testing connection for:', server.name)
    // TODO: Implement connection test
  }

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm('Are you sure you want to delete this MCP server?')) return

    const supabase = getBrowserClient()
    const { error } = await supabase
      .from('mcp_servers')
      .delete()
      .eq('id', serverId)

    if (!error) {
      setServers(servers.filter(s => s.id !== serverId))
    }
  }

  if (loading || isLoading) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">MCP Servers</h1>
          <p className="mt-2 text-gray-600">
            Connect external tools and data sources via Model Context Protocol
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Server
        </button>
      </div>

      {/* Quick Connect Options */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Connect</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleConnectGitHub}
            className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <Github className="w-6 h-6" />
            <div className="text-left">
              <div className="font-medium">GitHub MCP Server</div>
              <div className="text-sm text-gray-600">Access repos, PRs, and code search</div>
            </div>
          </button>
        </div>
      </div>

      {/* Server List */}
      <div className="space-y-4">
        {servers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No MCP servers configured yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Connect a server to access external tools and data
            </p>
          </div>
        ) : (
          servers.map(server => (
            <div
              key={server.id}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {server.is_oauth && server.oauth_provider === 'github' ? (
                      <Github className="w-6 h-6 text-gray-700" />
                    ) : (
                      <Server className="w-6 h-6 text-gray-700" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {server.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1">
                        {server.is_active ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-green-700">Connected</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-700">Disconnected</span>
                          </>
                        )}
                      </span>
                      <span className="text-gray-600">
                        Tools: {server.tools_count || 0}
                      </span>
                      <span className="text-gray-600">
                        Data Sources: {server.data_sources_count || 0}
                      </span>
                    </div>
                    {server.connection_error && (
                      <p className="mt-2 text-sm text-red-600">
                        Error: {server.connection_error}
                      </p>
                    )}
                    {server.last_connected_at && (
                      <p className="mt-2 text-sm text-gray-500">
                        Last sync: {new Date(server.last_connected_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestConnection(server)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Test connection"
                  >
                    <TestTube className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingServer(server)}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteServer(server.id)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      {(showAddDialog || editingServer) && (
        <AddEditMCPServerDialog
          server={editingServer}
          onClose={() => {
            setShowAddDialog(false)
            setEditingServer(null)
          }}
          onSave={() => {
            setShowAddDialog(false)
            setEditingServer(null)
            loadServers()
          }}
        />
      )}
    </div>
  )
}

// Add/Edit Dialog Component
function AddEditMCPServerDialog({ 
  server, 
  onClose, 
  onSave 
}: { 
  server?: MCPServer | null
  onClose: () => void
  onSave: () => void 
}) {
  const [name, setName] = useState(server?.name || '')
  const [config, setConfig] = useState(server?.config ? JSON.stringify(server.config, null, 2) : 
`{
  "servers": {
    "example": {
      "type": "http",
      "url": "https://api.example.com/mcp/",
      "headers": {
        "Authorization": "Bearer \${input:api_key}"
      }
    }
  },
  "inputs": [
    {
      "type": "promptString",
      "id": "api_key",
      "description": "API Key",
      "password": true
    }
  ]
}`)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    try {
      setError('')
      setIsSubmitting(true)

      // Validate JSON
      const parsedConfig = JSON.parse(config)
      
      const supabase = getBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Not authenticated')

      if (server) {
        // Update existing
        const { error } = await supabase
          .from('mcp_servers')
          .update({
            name,
            config: parsedConfig,
            updated_at: new Date().toISOString()
          })
          .eq('id', server.id)

        if (error) throw error
      } else {
        // Create new
        const serverConfig = parsedConfig.servers[Object.keys(parsedConfig.servers)[0]]
        
        const { error } = await supabase
          .from('mcp_servers')
          .insert({
            user_id: user.id,
            name,
            type: serverConfig.type || 'http',
            url: serverConfig.url,
            config: parsedConfig,
            is_oauth: false
          })

        if (error) throw error
      }

      onSave()
    } catch (err: any) {
      setError(err.message || 'Failed to save MCP server')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {server ? 'Edit MCP Server' : 'Add MCP Server'}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Server Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My MCP Server"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Configuration (JSON)
            </label>
            <textarea
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Paste your MCP configuration here..."
            />
            <p className="mt-2 text-sm text-gray-600">
              Use the GitHub MCP format. Variables like <code>\${'{'}input:api_key{'}'}</code> will prompt for values.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || !config || isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}