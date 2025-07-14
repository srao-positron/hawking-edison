'use client'

import { useEffect } from 'react'
import { ChevronRight, ChevronDown, Loader2, CheckCircle, XCircle, AlertCircle, Brain, MessageSquare, Wrench, Users, Clock, Zap, Activity, User, X, Eye, ArrowRight, Hash } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
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

export default function OrchestrationPanelV2({ 
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
    expandedSections = new Set(['timeline']),
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
    
    // Cleanup on unmount
    return () => {
      if (!isVisible) {
        unsubscribeFromSession(sessionId)
      }
    }
  }, [sessionId, isVisible, setActiveSession, loadSession, getSessionData, subscribeToSession, unsubscribeFromSession])

  // Create unified timeline combining events and tools
  const createUnifiedTimeline = () => {
    const timeline: any[] = []
    
    // Add events
    events.forEach(event => {
      if (event.event_type === 'tool_call') {
        const toolCall = toolCalls.find(tc => tc.tool_call_id === event.event_data?.tool_call_id)
        const toolResult = toolResults.get(event.event_data?.tool_call_id || '')
        if (toolCall) {
          timeline.push({
            type: 'tool',
            timestamp: event.created_at,
            toolCall,
            toolResult,
            event
          })
        }
      } else if (event.event_type !== 'tool_result') {
        // Skip tool_result as it's included with tool_call
        timeline.push({
          type: 'event',
          timestamp: event.created_at,
          event
        })
      }
    })
    
    // Sort by timestamp
    timeline.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime()
      const timeB = new Date(b.timestamp).getTime()
      return timelineSort === 'newest' ? timeB - timeA : timeA - timeB
    })
    
    return timeline
  }

  const getStatusBadge = () => {
    const badges = {
      pending: { icon: AlertCircle, class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      running: { icon: Loader2, class: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse' },
      completed: { icon: CheckCircle, class: 'bg-green-100 text-green-800 border-green-200' },
      failed: { icon: XCircle, class: 'bg-red-100 text-red-800 border-red-200' }
    }
    
    const badge = badges[status as keyof typeof badges] || badges.pending
    const Icon = badge.icon
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.class}`}>
        <Icon className={`w-3.5 h-3.5 ${status === 'running' ? 'animate-spin' : ''}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getEventIcon = (event: OrchestrationEvent) => {
    const icons: { [key: string]: any } = {
      'thinking': Brain,
      'agent_thought': Brain,
      'status_update': Activity,
      'message': MessageSquare,
      'discussion_turn': Users,
      'error': XCircle
    }
    const Icon = icons[event.event_type] || Activity
    return <Icon className="w-4 h-4" />
  }

  const getEventColor = (event: OrchestrationEvent) => {
    const colors: { [key: string]: string } = {
      'thinking': 'text-purple-600 bg-purple-50 border-purple-200',
      'agent_thought': 'text-purple-600 bg-purple-50 border-purple-200',
      'tool_call': 'text-blue-600 bg-blue-50 border-blue-200',
      'status_update': 'text-gray-600 bg-gray-50 border-gray-200',
      'message': 'text-green-600 bg-green-50 border-green-200',
      'discussion_turn': 'text-indigo-600 bg-indigo-50 border-indigo-200',
      'error': 'text-red-600 bg-red-50 border-red-200'
    }
    return colors[event.event_type] || 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const renderTimelineItem = (item: any) => {
    if (item.type === 'tool') {
      const { toolCall, toolResult } = item
      const isPending = !toolResult && (status === 'running' || status === 'pending')
      const isSuccess = toolResult?.success
      
      return (
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 bg-white rounded-lg border p-3 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">
                  {toolCall.tool.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                {toolCall.tool === 'createAgent' && toolCall.arguments?.specification && (
                  <div className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                    {toolCall.arguments.specification}
                  </div>
                )}
                {toolCall.tool === 'runDiscussion' && toolCall.arguments?.topic && (
                  <div className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                    {toolCall.arguments.topic}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</span>
                  {toolResult?.duration_ms && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(toolResult.duration_ms)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPending && (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                )}
                {!isPending && isSuccess && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {!isPending && !isSuccess && toolResult && (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                {onOpenToolDetails && (
                  <button
                    onClick={() => onOpenToolDetails(toolCall, toolResult)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Details
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    // Regular event
    const { event } = item
    const color = getEventColor(event)
    
    return (
      <div className="flex gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${color}`}>
          {getEventIcon(event)}
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-900">
            {event.event_type === 'thinking' || event.event_type === 'agent_thought' ? (
              <span>
                <span className="font-medium">
                  {event.event_data?.agent_name || 'Orchestrator'}
                </span>
                {' is thinking...'}
              </span>
            ) : event.event_type === 'discussion_turn' ? (
              <span>
                <span className="font-medium">{event.event_data?.agent_name}</span>
                {' in discussion'}
              </span>
            ) : (
              event.event_type.replace(/_/g, ' ')
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
          </div>
        </div>
      </div>
    )
  }

  if (!isVisible) return null

  if (isLoading) {
    return (
      <div className={fullScreen ? "flex items-center justify-center h-full" : "fixed bottom-4 right-4 w-96 h-96 bg-white rounded-lg shadow-xl border flex items-center justify-center"}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading orchestration details...</p>
        </div>
      </div>
    )
  }

  const unifiedTimeline = createUnifiedTimeline()

  return (
    <div className={fullScreen ? "h-full bg-gray-50" : "fixed bottom-4 right-4 w-[800px] h-[600px] bg-white rounded-lg shadow-xl border overflow-hidden"}>
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">Orchestration Details</h1>
            {getStatusBadge()}
            <span className="text-sm text-gray-500">
              <span className="font-medium">{toolCount}</span> tools • 
              <span className="font-medium ml-1">{agents.length}</span> agents
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {sessionId?.slice(0, 8)}
            </span>
            {!fullScreen && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>
        {sessionInfo?.error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {sessionInfo.error}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100%-73px)]">
        {/* Left Column - Agents */}
        <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Agents ({agents.length})
          </h3>
          
          {agents.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-8">
              No agents created yet
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-white rounded-lg border p-3 cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => toggleAgent(sessionId!, agent.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{agent.name}</div>
                      <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                        {agent.specification}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transform transition-transform ${
                      expandedAgents.has(agent.id) ? 'rotate-90' : ''
                    }`} />
                  </div>
                  
                  {expandedAgents.has(agent.id) && agent.thoughts.length > 0 && (
                    <div className="mt-2 pt-2 border-t space-y-1">
                      {agent.thoughts.slice(-3).map((thought, idx) => (
                        <div key={idx} className="text-xs">
                          <div className="text-gray-600 line-clamp-2">{thought.thought}</div>
                          {thought.is_key_decision && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              Key Decision
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Timeline */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Timeline
              </h3>
              <button
                onClick={() => setTimelineSort(sessionId!, timelineSort === 'newest' ? 'oldest' : 'newest')}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {timelineSort === 'newest' ? 'Newest first' : 'Oldest first'}
              </button>
            </div>
            
            <div className="space-y-3">
              {unifiedTimeline.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No activity yet
                </div>
              ) : (
                unifiedTimeline.map((item, idx) => (
                  <div key={idx}>
                    {renderTimelineItem(item)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}