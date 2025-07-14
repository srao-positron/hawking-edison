'use client'

import { useEffect, useState, useRef } from 'react'
import { ChevronRight, ChevronDown, Loader2, CheckCircle, XCircle, AlertCircle, Brain, MessageSquare, Wrench, Users, ArrowUpDown } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase-browser'
import { formatDistanceToNow } from 'date-fns'
import ToolCard from './orchestration/ToolCard'

interface OrchestrationEvent {
  id: string
  session_id: string
  event_type: string
  event_data: any
  created_at: string
}

interface Agent {
  id: string
  name: string
  specification: string
  thoughts: Array<{
    thought: string
    is_key_decision: boolean
    thought_type: string
    timestamp: string
  }>
}

interface Discussion {
  topic: string
  style: string
  turns: Array<{
    agent_id: string
    agent_name: string
    message: string
    round: number
    timestamp: string
  }>
}

interface OrchestrationPanelProps {
  sessionId: string | null
  isVisible: boolean
  onClose: () => void
}

interface SessionInfo {
  status: string
  error?: string
  final_response?: string
  created_at: string
  completed_at?: string
}

export default function OrchestrationPanel({ sessionId, isVisible, onClose }: OrchestrationPanelProps) {
  const [status, setStatus] = useState<string>('pending')
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [events, setEvents] = useState<OrchestrationEvent[]>([])
  const [agents, setAgents] = useState<Map<string, Agent>>(new Map())
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['timeline']))
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set())
  const [toolCount, setToolCount] = useState(0)
  const [timelineSort, setTimelineSort] = useState<'newest' | 'oldest'>('newest')
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!sessionId || !isVisible) return

    const supabase = getBrowserClient()
    
    // Load session info
    const loadSessionInfo = async () => {
      const { data: session, error: sessionError } = await supabase
        .from('orchestration_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      
      if (sessionError) {
        console.error('Failed to load session info:', sessionError)
        return
      }
      
      if (session) {
        setSessionInfo({
          status: session.status,
          error: session.error,
          final_response: session.final_response,
          created_at: session.created_at,
          completed_at: session.completed_at
        })
        setStatus(session.status)
      }
    }
    
    // Load existing events
    const loadEvents = async () => {
      const { data, error } = await supabase
        .from('orchestration_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to load orchestration events:', error)
        return
      }

      if (data) {
        setEvents(data)
        processEvents(data)
      }
    }

    loadSessionInfo()
    loadEvents()

    // Subscribe to new events
    const channel = supabase
      .channel(`orchestration:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orchestration_events',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newEvent = payload.new as OrchestrationEvent
          setEvents(prev => {
            const updated = [...prev, newEvent]
            processEvents(updated)
            return updated
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [sessionId, isVisible])

  const processEvents = (eventList: OrchestrationEvent[]) => {
    let currentStatus = 'pending'
    let tools = 0
    const agentMap = new Map<string, Agent>()
    const discussionMap = new Map<string, Discussion>()

    eventList.forEach(event => {
      const data = event.event_data

      switch (event.event_type) {
        case 'status_update':
          currentStatus = data.status || data.to || currentStatus
          break

        case 'tool_call':
          tools++
          break

        case 'agent_created':
          agentMap.set(data.agent_id, {
            id: data.agent_id,
            name: data.name,
            specification: data.specification,
            thoughts: []
          })
          break

        case 'agent_thought':
          const agent = agentMap.get(data.agent_id)
          if (agent) {
            agent.thoughts.push({
              thought: data.thought,
              is_key_decision: data.is_key_decision || false,
              thought_type: data.thought_type || 'general',
              timestamp: event.created_at
            })
          }
          break

        case 'discussion_turn':
          const discussionKey = `${data.topic}-${data.style}`
          let discussion = discussionMap.get(discussionKey)
          
          if (!discussion) {
            discussion = {
              topic: data.topic,
              style: data.style,
              turns: []
            }
            discussionMap.set(discussionKey, discussion)
          }
          
          discussion.turns.push({
            agent_id: data.agent_id,
            agent_name: data.agent_name,
            message: data.message,
            round: data.round,
            timestamp: event.created_at
          })
          break
      }
    })

    setStatus(currentStatus)
    setToolCount(tools)
    setAgents(agentMap)
    setDiscussions(Array.from(discussionMap.values()))
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const toggleAgent = (agentId: string) => {
    setExpandedAgents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(agentId)) {
        newSet.delete(agentId)
      } else {
        newSet.add(agentId)
      }
      return newSet
    })
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'running':
      case 'processing':
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
      case 'processing':
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
        return `Status: ${data.to || data.status || 'Updated'}`
      case 'tool_call':
        // Try to get friendly name from metadata
        const toolName = data.tool || 'tool'
        if (toolName.startsWith('mcp_')) {
          const parts = toolName.replace('mcp_', '').split('_')
          const service = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
          return `${service} API Called`
        }
        return `${toolName.replace(/([A-Z])/g, ' $1').trim()} Called`
      case 'tool_result':
        const resultToolName = data.tool || 'tool'
        const status = data.success ? '✓' : '✗'
        if (resultToolName.startsWith('mcp_')) {
          const parts = resultToolName.replace('mcp_', '').split('_')
          const service = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
          return `${status} ${service} Response`
        }
        return `${status} ${resultToolName.replace(/([A-Z])/g, ' $1').trim()}`
      case 'agent_created':
        return `🤖 Created: ${data.name || 'Agent'}`
      case 'agent_thought':
        return `💭 ${data.agent_name || 'Agent'} thinking`
      case 'discussion_turn':
        return `💬 ${data.agent_name || 'Agent'}: "${data.message?.substring(0, 50)}..."`
      case 'message':
        return '📨 Message sent'
      case 'error':
        return `⚠️ Error: ${data.error?.substring(0, 50)}...`
      default:
        return event.event_type.replace(/_/g, ' ')
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed right-0 top-0 h-screen w-[480px] bg-white shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">Orchestration Details</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Status Section */}
        <div className="border-b">
          <button
            onClick={() => toggleSection('status')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <span className="font-medium">Status</span>
            </div>
            {expandedSections.has('status') ? 
              <ChevronDown className="w-4 h-4 text-gray-400" /> : 
              <ChevronRight className="w-4 h-4 text-gray-400" />
            }
          </button>
          
          {expandedSections.has('status') && (
            <div className="px-6 pb-4 space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Current Status:</span>
                <span className="font-medium">{getStatusText()}</span>
              </div>
              
              {status === 'failed' && sessionInfo?.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="font-medium text-red-800 mb-1">Error Details:</div>
                  <div className="text-sm text-red-700">{sessionInfo.error}</div>
                  
                  {events.some(e => e.event_type === 'tool_result' && e.event_data.success) && (
                    <div className="mt-3 text-sm text-orange-700 bg-orange-50 p-2 rounded">
                      <strong>Note:</strong> Some operations may have completed successfully before the error occurred. 
                      Check the timeline and tool results below for details.
                    </div>
                  )}
                </div>
              )}
              
              {sessionInfo?.final_response && (
                <div className="text-sm text-gray-600">
                  <div className="font-medium mb-1">Final Response:</div>
                  <div className="bg-gray-50 p-2 rounded">
                    {(() => {
                      try {
                        const parsed = JSON.parse(sessionInfo.final_response)
                        return parsed.content || sessionInfo.final_response
                      } catch {
                        return sessionInfo.final_response
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tools Section */}
        <div className="border-b">
          <button
            onClick={() => toggleSection('tools')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Tools ({toolCount})</span>
            </div>
            {expandedSections.has('tools') ? 
              <ChevronDown className="w-4 h-4 text-gray-400" /> : 
              <ChevronRight className="w-4 h-4 text-gray-400" />
            }
          </button>
          
          {expandedSections.has('tools') && (
            <div className="px-6 pb-4">
              {toolCount === 0 ? (
                <div className="text-gray-500 text-sm">
                  No tools have been called yet
                </div>
              ) : (
                <div className="space-y-2">
                  {events
                    .filter(e => e.event_type === 'tool_call')
                    .map((event) => {
                      const toolResult = events.find(
                        e => e.event_type === 'tool_result' && 
                        e.event_data.tool_call_id === event.event_data.tool_call_id
                      )
                      
                      // Check if tool is still running (no result yet and session is active)
                      const isPending = !toolResult && (status === 'running' || status === 'pending')
                      
                      return (
                        <ToolCard
                          key={event.id}
                          toolCall={event.event_data}
                          toolResult={toolResult?.event_data}
                          isPending={isPending}
                        />
                      )
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Agents Section */}
        {agents.size > 0 && (
          <div className="border-b">
            <button
              onClick={() => toggleSection('agents')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Agents ({agents.size})</span>
              </div>
              {expandedSections.has('agents') ? 
                <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                <ChevronRight className="w-4 h-4 text-gray-400" />
              }
            </button>
            
            {expandedSections.has('agents') && (
              <div className="px-6 pb-4 space-y-3">
                {Array.from(agents.values()).map(agent => (
                  <div key={agent.id} className="border rounded-lg p-3">
                    <button
                      onClick={() => toggleAgent(agent.id)}
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
                                    : thought.thought_type === 'discussion_contribution'
                                    ? 'bg-green-50 border-l-2 border-green-400'
                                    : 'bg-gray-50'
                                }`}
                              >
                                <div className="whitespace-pre-wrap">
                                  {thought.thought}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                                  <span>{formatDistanceToNow(new Date(thought.timestamp), { addSuffix: true })}</span>
                                  {thought.is_key_decision && (
                                    <span className="text-blue-600 font-medium">Key Decision</span>
                                  )}
                                  {thought.thought_type === 'discussion_contribution' && (
                                    <span className="text-green-600 font-medium">Discussion</span>
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
            )}
          </div>
        )}

        {/* Discussions Section */}
        {discussions.length > 0 && (
          <div className="border-b">
            <button
              onClick={() => toggleSection('discussions')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Discussions ({discussions.length})</span>
              </div>
              {expandedSections.has('discussions') ? 
                <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                <ChevronRight className="w-4 h-4 text-gray-400" />
              }
            </button>
            
            {expandedSections.has('discussions') && (
              <div className="px-6 pb-4 space-y-3">
                {discussions.length === 0 ? (
                  <div className="text-gray-500 text-sm">
                    No agent discussions yet
                  </div>
                ) : (
                  discussions.map((discussion, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <div className="font-medium text-sm mb-2">
                        {discussion.topic}
                        <span className="text-xs text-gray-500 ml-2">({discussion.style})</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {discussion.turns.length} exchange{discussion.turns.length !== 1 ? 's' : ''}
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {discussion.turns.length === 0 ? (
                          <div className="text-gray-400 text-xs italic">
                            Waiting for agent responses...
                          </div>
                        ) : (
                          discussion.turns.map((turn, turnIdx) => (
                            <div key={turnIdx} className="bg-gray-50 rounded p-2">
                              <div className="font-medium text-xs text-gray-700 mb-1">
                                {turn.agent_name} (Round {turn.round}):
                              </div>
                              <div className="text-xs text-gray-600 whitespace-pre-wrap">
                                {turn.message}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Timeline Section */}
        <div>
          <button
            onClick={() => toggleSection('timeline')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium">Timeline ({events.length})</span>
              {expandedSections.has('timeline') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setTimelineSort(timelineSort === 'newest' ? 'oldest' : 'newest')
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
                  (timelineSort === 'newest' ? events.slice().reverse() : events.slice()).map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
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
      </div>
    </div>
  )
}