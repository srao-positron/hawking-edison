'use client'

import { useState, useEffect } from 'react'
import { 
  Users, MessageSquare, BarChart3, FileText, 
  ChevronDown, ChevronRight, Eye, Code,
  Sparkles, Brain, Wrench
} from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase-browser'

interface Artifact {
  id: string
  type: 'agent_conversation' | 'visualization' | 'tool_execution' | 'document'
  title: string
  timestamp: Date
  content: any
  metadata?: any
}

interface ArtifactRendererProps {
  threadId: string
  sessionId?: string
}

export default function ArtifactRenderer({ threadId, sessionId }: ArtifactRendererProps) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [expandedArtifacts, setExpandedArtifacts] = useState<Set<string>>(new Set())
  const [selectedView, setSelectedView] = useState<'all' | 'agents' | 'visualizations' | 'tools'>('all')
  const supabase = getBrowserClient()

  // Subscribe to realtime updates
  useEffect(() => {
    // Load initial artifacts
    loadArtifacts()

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`thread_${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_conversations',
          filter: `parent_thread_id=eq.${threadId}`
        },
        (payload) => {
          const newArtifact: Artifact = {
            id: payload.new.id,
            type: 'agent_conversation',
            title: `Agent: ${payload.new.agent_specification.split('.')[0]}`,
            timestamp: new Date(payload.new.created_at),
            content: payload.new.messages,
            metadata: payload.new
          }
          setArtifacts(prev => [newArtifact, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'visualizations',
          filter: `thread_id=eq.${threadId}`
        },
        (payload) => {
          const newArtifact: Artifact = {
            id: payload.new.id,
            type: 'visualization',
            title: `${payload.new.type}: ${payload.new.generation_prompt?.substring(0, 50)}...`,
            timestamp: new Date(payload.new.created_at),
            content: payload.new.content,
            metadata: payload.new
          }
          setArtifacts(prev => [newArtifact, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tool_executions',
          filter: sessionId ? `session_id=eq.${sessionId}` : undefined
        },
        (payload) => {
          if (payload.new.tool_name !== 'createVisualization' && 
              payload.new.tool_name !== 'createAgent') {
            const newArtifact: Artifact = {
              id: payload.new.id,
              type: 'tool_execution',
              title: `Tool: ${payload.new.tool_name}`,
              timestamp: new Date(payload.new.started_at),
              content: {
                parameters: payload.new.parameters,
                result: payload.new.result,
                status: payload.new.status
              },
              metadata: payload.new
            }
            setArtifacts(prev => [newArtifact, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId, sessionId])

  const loadArtifacts = async () => {
    try {
      // Load agent conversations
      const { data: agentConvos } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('parent_thread_id', threadId)
        .order('created_at', { ascending: false })

      // Load visualizations
      const { data: visualizations } = await supabase
        .from('visualizations')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })

      // Load tool executions if sessionId provided
      let toolExecutions = []
      if (sessionId) {
        const { data } = await supabase
          .from('tool_executions')
          .select('*')
          .eq('session_id', sessionId)
          .not('tool_name', 'in', '(createVisualization,createAgent)')
          .order('started_at', { ascending: false })
        toolExecutions = data || []
      }

      // Combine and sort artifacts
      const allArtifacts: Artifact[] = [
        ...(agentConvos || []).map(a => ({
          id: a.id,
          type: 'agent_conversation' as const,
          title: `Agent: ${a.agent_specification.split('.')[0]}`,
          timestamp: new Date(a.created_at),
          content: a.messages,
          metadata: a
        })),
        ...(visualizations || []).map(v => ({
          id: v.id,
          type: 'visualization' as const,
          title: `${v.type}: ${v.generation_prompt?.substring(0, 50)}...`,
          timestamp: new Date(v.created_at),
          content: v.content,
          metadata: v
        })),
        ...toolExecutions.map(t => ({
          id: t.id,
          type: 'tool_execution' as const,
          title: `Tool: ${t.tool_name}`,
          timestamp: new Date(t.started_at),
          content: {
            parameters: t.parameters,
            result: t.result,
            status: t.status
          },
          metadata: t
        }))
      ]

      allArtifacts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      setArtifacts(allArtifacts)
    } catch (error) {
      console.error('Failed to load artifacts:', error)
    }
  }

  const toggleArtifact = (id: string) => {
    setExpandedArtifacts(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const getIcon = (type: Artifact['type']) => {
    switch (type) {
      case 'agent_conversation':
        return <Users className="w-4 h-4" />
      case 'visualization':
        return <BarChart3 className="w-4 h-4" />
      case 'tool_execution':
        return <Wrench className="w-4 h-4" />
      case 'document':
        return <FileText className="w-4 h-4" />
    }
  }

  const filteredArtifacts = artifacts.filter(artifact => {
    if (selectedView === 'all') return true
    if (selectedView === 'agents') return artifact.type === 'agent_conversation'
    if (selectedView === 'visualizations') return artifact.type === 'visualization'
    if (selectedView === 'tools') return artifact.type === 'tool_execution'
    return true
  })

  const renderContent = (artifact: Artifact) => {
    const isExpanded = expandedArtifacts.has(artifact.id)

    switch (artifact.type) {
      case 'agent_conversation':
        return (
          <div className="space-y-2">
            {!isExpanded && artifact.content.length > 0 && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {artifact.content[artifact.content.length - 1]?.content}
              </p>
            )}
            {isExpanded && (
              <div className="space-y-3">
                {artifact.content.map((msg: any, idx: number) => (
                  <div key={idx} className={`text-sm ${
                    msg.role === 'system' ? 'text-gray-500 italic' :
                    msg.role === 'user' ? 'text-blue-600' :
                    'text-gray-700'
                  }`}>
                    <div className="font-medium">{msg.role}:</div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'visualization':
        return (
          <div>
            {!isExpanded && (
              <p className="text-sm text-gray-600">Click to view visualization</p>
            )}
            {isExpanded && (
              <div className="bg-white p-4 rounded border border-gray-200">
                {artifact.content.includes('<svg') ? (
                  <div dangerouslySetInnerHTML={{ __html: artifact.content }} />
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-sm">
                    {artifact.content}
                  </pre>
                )}
              </div>
            )}
          </div>
        )

      case 'tool_execution':
        return (
          <div>
            {!isExpanded && (
              <p className="text-sm text-gray-600">
                Status: <span className={`font-medium ${
                  artifact.content.status === 'completed' ? 'text-green-600' :
                  artifact.content.status === 'failed' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>{artifact.content.status}</span>
              </p>
            )}
            {isExpanded && (
              <div className="space-y-3">
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase">Parameters</h5>
                  <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(artifact.content.parameters, null, 2)}
                  </pre>
                </div>
                {artifact.content.result && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-500 uppercase">Result</h5>
                    <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(artifact.content.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex gap-2">
          {(['all', 'agents', 'visualizations', 'tools'] as const).map(view => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                selectedView === view
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Artifacts List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredArtifacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No artifacts yet</p>
            <p className="text-xs mt-1">Tool outputs will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredArtifacts.map(artifact => (
              <div
                key={artifact.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
              >
                <button
                  onClick={() => toggleArtifact(artifact.id)}
                  className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {expandedArtifacts.has(artifact.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {getIcon(artifact.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {artifact.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {artifact.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </button>
                
                {expandedArtifacts.has(artifact.id) && (
                  <div className="px-4 pb-3 pl-14">
                    {renderContent(artifact)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}