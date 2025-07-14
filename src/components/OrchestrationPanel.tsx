'use client'

import { useEffect } from 'react'
import { ChevronRight, ChevronDown, Loader2, CheckCircle, XCircle, AlertCircle, Brain, MessageSquare, Wrench, Users, ArrowUpDown, Clock, Zap, GitBranch, Sparkles, Eye, Activity, User, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import ToolCard from './orchestration/ToolCard'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatDuration } from '@/utils/format-duration'
import { useOrchestrationStore, type OrchestrationEvent } from '@/stores/orchestration-store'

interface OrchestrationPanelProps {
  sessionId: string | null
  isVisible: boolean
  onClose?: () => void
  fullScreen?: boolean
  onOpenToolDetails?: (toolCall: any, toolResult: any) => void
}

export default function OrchestrationPanel({ 
  sessionId, 
  isVisible, 
  onClose, 
  fullScreen = false,
  onOpenToolDetails 
}: OrchestrationPanelProps) {
  // Zustand store
  const { 
    loadSession, 
    getSessionData,
    getUIState,
    setActiveSession,
    toggleSection,
    toggleAgent,
    setTimelineSort,
    loadingStates,
    subscribeToSession,
    unsubscribeFromSession
  } = useOrchestrationStore()
  
  // Get loading state
  const isLoading = sessionId ? loadingStates.get(sessionId) || false : false
  
  // Get session data and UI state
  const sessionData = sessionId ? getSessionData(sessionId) : null
  const uiState = sessionId ? getUIState(sessionId) : null
  
  
  const { 
    info: sessionInfo, 
    events = [], 
    agents = [], 
    discussions = [], 
    toolCalls = [], 
    toolResults = new Map(),
    artifacts = []
  } = sessionData || {}
  
  const {
    expandedSections = new Set(['status', 'timeline']),
    expandedAgents = new Set(),
    timelineSort = 'newest'
  } = uiState || {}
  
  const status = sessionInfo?.status || 'pending'
  const toolCount = toolCalls.length

  useEffect(() => {
    if (!sessionId) return

    // Only load session if we don't already have data for it
    const existingData = getSessionData(sessionId)
    if (!existingData.info && isVisible) {
      setActiveSession(sessionId)
      loadSession(sessionId)
    }
    
    // Always subscribe to realtime updates when visible
    if (isVisible) {
      subscribeToSession(sessionId)
    }
    
    // Cleanup on unmount - just unsubscribe, don't clear data
    return () => {
      if (!isVisible) {
        unsubscribeFromSession(sessionId)
      }
    }
  }, [sessionId, isVisible, setActiveSession, loadSession, getSessionData, subscribeToSession, unsubscribeFromSession])

  // UI event handlers using store actions
  const handleToggleSection = (section: string) => {
    if (sessionId) {
      toggleSection(sessionId, section)
    }
  }

  const handleToggleAgent = (agentId: string) => {
    if (sessionId) {
      toggleAgent(sessionId, agentId)
    }
  }

  const handleSetTimelineSort = (sort: 'newest' | 'oldest') => {
    if (sessionId) {
      setTimelineSort(sessionId, sort)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'running':
        return 'Running'
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      default:
        return 'Unknown'
    }
  }

  const getEventDescription = (event: OrchestrationEvent) => {
    const data = event.event_data
    switch (event.event_type) {
      case 'status_update':
        const statusColors: { [key: string]: string } = {
          'running': 'text-blue-600',
          'completed': 'text-green-600',
          'failed': 'text-red-600',
          'pending': 'text-yellow-600'
        }
        const statusValue = data.to || data.status || 'Updated'
        return (
          <span className={`flex items-center gap-2 ${statusColors[statusValue] || 'text-gray-600'}`}>
            <Activity className="w-4 h-4" />
            Status: {statusValue}
          </span>
        )
      case 'tool_call':
        const toolName = data.tool || 'tool'
        let displayName = toolName.startsWith('mcp_') 
          ? toolName.replace('mcp_', '').split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          : toolName.replace(/([A-Z])/g, ' $1').trim()
        
        // Add specific details for certain tools
        if (data.tool === 'createAgent' && data.arguments?.specification) {
          // Extract agent name from specification
          const nameMatch = data.arguments.specification.match(/(?:named?|called?)\s+["`']?([^"`']+)["`']?/i) ||
                           data.arguments.specification.match(/^([^,.!]+)(?:[,.!]|$)/)
          if (nameMatch) {
            displayName = `Create Agent: ${nameMatch[1].trim()}`
          }
        } else if (data.tool === 'runDiscussion' && data.arguments?.topic) {
          const topic = data.arguments.topic
          if (topic.length > 40) {
            displayName = `Run Discussion: ${topic.substring(0, 40)}...`
          } else {
            displayName = `Run Discussion: ${topic}`
          }
        }
        
        // Show who is calling the tool
        const actor = data.agent_id || data.agent_name 
          ? data.agent_name || agents.find(a => a.id === data.agent_id)?.name || 'Agent'
          : 'Orchestrator'
          
        return (
          <div>
            <span className="flex items-center gap-2 text-blue-600">
              <Zap className="w-4 h-4" />
              {displayName}
            </span>
            <span className="text-xs text-gray-500 ml-6">by {actor}</span>
          </div>
        )
      case 'tool_result':
        const resultToolName = data.tool || 'tool'
        const resultFriendlyName = resultToolName.startsWith('mcp_')
          ? resultToolName.replace('mcp_', '').split('_')[0].charAt(0).toUpperCase() + resultToolName.replace('mcp_', '').split('_')[0].slice(1)
          : resultToolName.replace(/([A-Z])/g, ' $1').trim()
        return data.success ? (
          <span className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            {resultFriendlyName} Success
          </span>
        ) : (
          <span className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            {resultFriendlyName} Failed
          </span>
        )
      case 'thinking':
      case 'agent_thought':
        // Check if this is an agent thinking
        if (data.agent_id || data.agent_name || data.step === 'agent_discussion') {
          const agentName = data.agent_name || 
                           agents.find(a => a.id === data.agent_id)?.name || 
                           'Unknown Agent'
          return (
            <span className="flex items-center gap-2 text-purple-600">
              <Brain className="w-4 h-4" />
              <span className="font-medium">{agentName}</span> thinking
            </span>
          )
        }
        return (
          <span className="flex items-center gap-2 text-purple-600">
            <Brain className="w-4 h-4" />
            Orchestrator thinking
          </span>
        )
      case 'message':
        return (
          <span className="flex items-center gap-2 text-gray-600">
            <MessageSquare className="w-4 h-4" />
            Message sent
          </span>
        )
      case 'discussion_turn':
        return (
          <span className="flex items-center gap-2 text-indigo-600">
            <Users className="w-4 h-4" />
            <span className="font-medium">{data.agent_name || 'Agent'}</span> in discussion
          </span>
        )
      case 'error':
        return (
          <span className="flex items-center gap-2 text-red-600">
            <XCircle className="w-4 h-4" />
            Error: {data.error?.substring(0, 50)}...
          </span>
        )
      default:
        return (
          <span className="text-gray-600">
            {event.event_type.replace(/_/g, ' ')}
          </span>
        )
    }
  }

  if (!isVisible) return null

  const containerClass = fullScreen 
    ? "flex flex-col h-full bg-gray-50"
    : "fixed bottom-4 right-4 w-96 max-h-[80vh] bg-white rounded-lg shadow-xl border overflow-hidden"

  return (
    <div className={containerClass}>
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        {fullScreen ? (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Orchestration Details</h1>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <Eye className="w-3 h-3" />
              <span>Session: {sessionId?.slice(0, 8)}...</span>
            </div>
          </div>
        ) : (
          <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Orchestration Details</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading orchestration details...</p>
            </div>
          </div>
        ) : fullScreen ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - Status and Timeline */}
            <div className="xl:col-span-1 space-y-6">
              {/* Status Card */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-gray-600" />
                    Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon()}
                      <span className="text-lg font-medium">{getStatusText()}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Tools Used: {toolCount}</div>
                      <div>Agents Created: {agents.length}</div>
                    </div>
                    {sessionInfo?.error && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <div className="text-sm text-red-700">{sessionInfo.error}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline Card - Redesigned */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                      <GitBranch className="w-4 h-4 text-indigo-500" />
                      Event Flow
                    </h3>
                    <button
                      onClick={() => handleSetTimelineSort(timelineSort === 'newest' ? 'oldest' : 'newest')}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      <span>{timelineSort === 'newest' ? 'Newest' : 'Oldest'}</span>
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {events.length === 0 ? (
                      <div className="text-gray-500 text-xs text-center py-4">No events yet</div>
                    ) : (
                      (timelineSort === 'newest' ? events.slice().reverse() : events.slice()).map((event, idx) => {
                        // Find related tool result for tool calls
                        const relatedResult = event.event_type === 'tool_call' 
                          ? events.find(e => 
                              e.event_type === 'tool_result' && 
                              e.event_data?.tool_call_id === event.event_data?.tool_call_id
                            )
                          : null
                        
                        // Skip tool results that are shown as part of tool calls
                        if (event.event_type === 'tool_result') {
                          const hasRelatedCall = events.some(e => 
                            e.event_type === 'tool_call' && 
                            e.event_data?.tool_call_id === event.event_data?.tool_call_id
                          )
                          if (hasRelatedCall) return null
                        }
                        
                        return (
                          <div key={`timeline-event-${idx}-${event.id || 'no-id'}`} className="relative">
                            <div className={`
                              flex items-start gap-2 p-2 rounded-lg transition-all
                              ${event.event_type === 'tool_call' ? 'bg-blue-50 border border-blue-200' : ''}
                              ${event.event_type === 'thinking' ? 'bg-purple-50 border border-purple-200' : ''}
                              ${event.event_type === 'status_update' ? 'bg-gray-50 border border-gray-200' : ''}
                              ${!['tool_call', 'thinking', 'status_update'].includes(event.event_type) ? 'bg-gray-50' : ''}
                              hover:shadow-sm
                            `}>
                              <div className="flex-1">
                                <div className="text-xs font-medium">
                                  {getEventDescription(event)}
                                </div>
                                {relatedResult && (
                                  <div className="mt-1 ml-6 text-xs">
                                    <span className="text-gray-400">→</span> {getEventDescription(relatedResult)}
                                  </div>
                                )}
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      }).filter(Boolean)
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column - Tools */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border h-full">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-gray-600" />
                    Tools ({toolCount})
                  </h3>
                  
                  {toolCount === 0 ? (
                    <div className="text-gray-500 text-sm">No tools have been called yet</div>
                  ) : (
                    <div className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto">
                      {toolCalls.map((toolCall) => {
                        const toolResult = toolResults.get(toolCall.tool_call_id)
                        const isPending = !toolResult && (status === 'running' || status === 'pending')
                        
                        return (
                          <ToolCard
                            key={toolCall.tool_call_id}
                            toolCall={toolCall}
                            toolResult={toolResult}
                            isPending={isPending}
                            onLoadDetails={onOpenToolDetails}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Agents & Discussions */}
            <div className="xl:col-span-1 space-y-6">
              {/* Agents Card */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-gray-600" />
                    Agents ({agents.length})
                  </h3>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {agents.map((agent, index) => (
                      <div key={`agent-${agent.id}-${index}`} className="border rounded-lg p-3">
                        <button
                          onClick={() => handleToggleAgent(agent.id)}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <div>
                            <div className="font-medium text-sm">{agent.name}</div>
                            <div className="text-xs text-gray-500">{agent.specification}</div>
                          </div>
                          {expandedAgents.has(agent.id) ? 
                            <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          }
                        </button>
                        
                        {expandedAgents.has(agent.id) && (
                          <div className="mt-3 space-y-2">
                            {agent.thoughts.length === 0 ? (
                              <div className="text-xs text-gray-400 italic p-2">
                                No thoughts recorded yet
                              </div>
                            ) : (
                              <>
                                <div className="text-xs font-medium text-gray-700">Thoughts & Analysis:</div>
                                {agent.thoughts.map((thought, idx) => (
                                  <div 
                                    key={idx}
                                    className={`text-xs p-2 rounded ${
                                      thought.is_key_decision 
                                        ? 'bg-blue-50 border-l-2 border-blue-400' 
                                        : 'bg-gray-50'
                                    }`}
                                  >
                                    <div className="prose prose-xs max-w-none">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {thought.thought}
                                      </ReactMarkdown>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                                      <span>{formatDistanceToNow(new Date(thought.timestamp), { addSuffix: true })}</span>
                                      {thought.is_key_decision && (
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                          Key Decision
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Discussions Card */}
              {discussions.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-gray-600" />
                      Discussions ({discussions.length})
                    </h3>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {discussions.map((discussion, idx) => (
                        <div key={idx} className="border rounded-lg p-3">
                          <div className="font-medium text-sm mb-2">
                            {discussion.topic}
                            <span className="text-xs text-gray-500 ml-2">({discussion.style})</span>
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            {discussion.turns.length} exchange{discussion.turns.length !== 1 ? 's' : ''}
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {discussion.turns.map((turn, turnIdx) => (
                              <div key={turnIdx} className="bg-gray-50 rounded p-2">
                                <div className="font-medium text-xs text-gray-700 mb-1">
                                  {turn.agent_name} (Round {turn.round}):
                                </div>
                                <div className="prose prose-xs max-w-none text-gray-600">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {turn.message}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Artifacts Card */}
              {artifacts.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-gray-600" />
                      Artifacts ({artifacts.length})
                    </h3>
                    
                    <div className="space-y-2">
                      {artifacts.map((artifact) => (
                        <div 
                          key={artifact.id} 
                          className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => {
                            // TODO: Open artifact in new tab
                            console.log('Open artifact:', artifact)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-700">{artifact.title}</span>
                            <span className="text-xs text-gray-500">({artifact.type})</span>
                          </div>
                          <Eye className="w-3 h-3 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Compact view for sidebar mode
          <>
            {/* Status Section */}
            <div>
              <button
                onClick={() => handleToggleSection('status')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium">Status</span>
                {expandedSections.has('status') ? 
                  <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                }
              </button>
              
              {expandedSections.has('status') && (
                <div className="px-6 pb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon()}
                    <span className="text-lg font-medium">{getStatusText()}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <div>Tools Used: {toolCount}</div>
                    <div>Agents Created: {agents.length}</div>
                  </div>
                  {sessionInfo?.error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <div className="text-sm text-red-700">{sessionInfo.error}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tools Section */}
            <div>
              <button
                onClick={() => handleToggleSection('tools')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium">Tools ({toolCount})</span>
                {expandedSections.has('tools') ? 
                  <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                }
              </button>
              
              {expandedSections.has('tools') && (
                <div className="px-6 pb-4">
                  {toolCount === 0 ? (
                    <div className="text-gray-500 text-sm">No tools have been called yet</div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {toolCalls.map((toolCall) => {
                        const toolResult = toolResults.get(toolCall.tool_call_id)
                        const isPending = !toolResult && (status === 'running' || status === 'pending')
                        
                        return (
                          <ToolCard
                            key={toolCall.tool_call_id}
                            toolCall={toolCall}
                            toolResult={toolResult}
                            isPending={isPending}
                            onLoadDetails={onOpenToolDetails}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timeline Section */}
            <div>
              <button
                onClick={() => handleToggleSection('timeline')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">Timeline ({events.length})</span>
                  {expandedSections.has('timeline') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSetTimelineSort(timelineSort === 'newest' ? 'oldest' : 'newest')
                      }}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      title={`Sort by ${timelineSort === 'newest' ? 'oldest' : 'newest'} first`}
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      <span>{timelineSort === 'newest' ? 'Newest' : 'Oldest'}</span>
                    </button>
                  )}
                </div>
                {expandedSections.has('timeline') ? 
                  <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                }
              </button>
              
              {expandedSections.has('timeline') && (
                <div className="px-6 pb-4">
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {events.length === 0 ? (
                      <div className="text-gray-500 text-sm">No events yet</div>
                    ) : (
                      (timelineSort === 'newest' ? events.slice().reverse() : events.slice()).map((event, idx) => (
                        <div key={`sidebar-event-${event.id || idx}`} className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {getEventDescription(event)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}