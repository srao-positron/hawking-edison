import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { getBrowserClient } from '@/lib/supabase-browser'

// Types
export interface OrchestrationEvent {
  id: string
  event_type: string
  event_data: any
  created_at: string
  session_id: string
}

export interface Agent {
  id: string
  name: string
  specification: string
  expertise?: string[]
  persona?: string
  thoughts: AgentThought[]
}

export interface AgentThought {
  thought: string
  is_key_decision: boolean
  thought_type: string
  timestamp: string
}

export interface Discussion {
  id: string
  topic: string
  style: string
  turns: DiscussionTurn[]
}

export interface DiscussionTurn {
  agent_id: string
  agent_name: string
  message: string
  round: number
  timestamp: string
}

export interface ToolCall {
  tool: string
  arguments: any
  tool_call_id: string
  timestamp?: string
}

export interface ToolResult {
  success: boolean
  result?: any
  error?: string
  duration_ms?: number
  tool_call_id: string
  summary?: string  // AI-generated summary from Lambda
}

export interface Artifact {
  id: string
  type: 'markdown' | 'image' | 'svg' | 'html' | 'code' | 'json'
  title: string
  content: string | any
  source: {
    toolCallId?: string
    agentId?: string
    discussionId?: string
  }
  metadata?: any
}

export interface SessionInfo {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  error?: string
  completedAt?: string
  created_at?: string
}

interface OrchestrationState {
  // Session management
  sessions: Map<string, SessionInfo>
  activeSessionId: string | null
  
  // Data by session
  eventsBySession: Map<string, OrchestrationEvent[]>
  agentsBySession: Map<string, Map<string, Agent>>
  discussionsBySession: Map<string, Discussion[]>
  toolCallsBySession: Map<string, Map<string, ToolCall>>
  toolResultsBySession: Map<string, Map<string, ToolResult>>
  artifactsBySession: Map<string, Artifact[]>
  
  // UI state by session
  expandedSectionsBySession: Map<string, Set<string>>
  expandedAgentsBySession: Map<string, Set<string>>
  timelineSortBySession: Map<string, 'newest' | 'oldest'>
  
  // ChatInterface specific state
  currentOrchestrationId: string | null
  showOrchestrationPanel: boolean
  orchestrationsByThread: Map<string, string[]> // threadId -> orchestrationIds
  
  // Thread management state
  selectedThreadId: string | null
  
  // Realtime subscriptions
  subscriptions: Map<string, any>
  
  // Loading states
  loadingStates: Map<string, boolean>
}

interface OrchestrationActions {
  // Session management
  setActiveSession: (sessionId: string | null) => void
  loadSession: (sessionId: string) => Promise<void>
  clearSession: (sessionId: string) => void
  
  // Event handling
  addEvent: (sessionId: string, event: OrchestrationEvent) => void
  processRealtimeEvent: (sessionId: string, event: any) => void
  processSessionEvents: (sessionId: string, events: OrchestrationEvent[]) => void
  
  // Artifact management
  addArtifact: (sessionId: string, artifact: Artifact) => void
  detectAndExtractArtifacts: (sessionId: string, toolResult: ToolResult) => void
  
  // Subscription management
  subscribeToSession: (sessionId: string) => void
  unsubscribeFromSession: (sessionId: string) => void
  
  // UI state management
  toggleSection: (sessionId: string, section: string) => void
  toggleAgent: (sessionId: string, agentId: string) => void
  setTimelineSort: (sessionId: string, sort: 'newest' | 'oldest') => void
  
  // ChatInterface state management
  setCurrentOrchestrationId: (orchestrationId: string | null) => void
  setShowOrchestrationPanel: (show: boolean) => void
  addOrchestrationToThread: (threadId: string, orchestrationId: string) => void
  loadOrchestrationsByThread: (threadId: string) => Promise<void>
  
  // Thread management
  setSelectedThreadId: (threadId: string | null) => void
  
  // Getters
  getSessionData: (sessionId: string) => {
    info?: SessionInfo
    events: OrchestrationEvent[]
    agents: Agent[]
    discussions: Discussion[]
    toolCalls: ToolCall[]
    toolResults: Map<string, ToolResult>
    artifacts: Artifact[]
  }
  getUIState: (sessionId: string) => {
    expandedSections: Set<string>
    expandedAgents: Set<string>
    timelineSort: 'newest' | 'oldest'
  }
  getOrchestrationsByThread: (threadId: string) => string[]
}

type OrchestrationStore = OrchestrationState & OrchestrationActions

// Artifact detection utilities
function detectArtifactType(content: any): Artifact['type'] | null {
  if (typeof content !== 'string') return null
  
  const trimmed = content.trim()
  
  // SVG detection
  if (trimmed.includes('<svg') && trimmed.includes('</svg>')) return 'svg'
  
  // HTML detection
  if (trimmed.includes('<html') || trimmed.includes('<!DOCTYPE')) return 'html'
  
  // Image URL detection
  if (trimmed.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp|svg)$/i)) return 'image'
  
  // Markdown detection (must have markdown indicators)
  if (trimmed.includes('```') || trimmed.includes('##') || trimmed.includes('**')) return 'markdown'
  
  // Code detection (single language code block)
  if (trimmed.startsWith('```') && trimmed.endsWith('```')) return 'code'
  
  return null
}

function extractArtifactTitle(content: string, type: Artifact['type']): string {
  switch (type) {
    case 'markdown':
      // Try to extract first heading
      const headingMatch = content.match(/^#+ (.+)$/m)
      if (headingMatch) return headingMatch[1]
      return 'Markdown Document'
    
    case 'svg':
      // Try to extract title element
      const titleMatch = content.match(/<title>(.+?)<\/title>/)
      if (titleMatch) return titleMatch[1]
      return 'SVG Diagram'
    
    case 'html':
      // Try to extract title tag
      const htmlTitleMatch = content.match(/<title>(.+?)<\/title>/)
      if (htmlTitleMatch) return htmlTitleMatch[1]
      return 'HTML Document'
    
    case 'code':
      // Extract language from code fence
      const langMatch = content.match(/^```(\w+)/)
      if (langMatch) return `${langMatch[1]} Code`
      return 'Code Snippet'
    
    default:
      return 'Artifact'
  }
}

// Create store
export const useOrchestrationStore = create<OrchestrationStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      sessions: new Map(),
      activeSessionId: null,
      eventsBySession: new Map(),
      agentsBySession: new Map(),
      discussionsBySession: new Map(),
      toolCallsBySession: new Map(),
      toolResultsBySession: new Map(),
      artifactsBySession: new Map(),
      expandedSectionsBySession: new Map(),
      expandedAgentsBySession: new Map(),
      timelineSortBySession: new Map(),
      currentOrchestrationId: null,
      showOrchestrationPanel: false,
      orchestrationsByThread: new Map(),
      selectedThreadId: null,
      subscriptions: new Map(),
      loadingStates: new Map(),
      
      // Actions
      setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
      
      loadSession: async (sessionId) => {
        const { loadingStates } = get()
        if (loadingStates.get(sessionId)) return // Already loading
        
        
        set(state => ({
          loadingStates: new Map(state.loadingStates).set(sessionId, true)
        }))
        
        try {
          const supabase = getBrowserClient()
          
          // Load orchestration session data
          const { data: sessionData, error } = await supabase
            .from('orchestration_sessions')
            .select('*')
            .eq('id', sessionId)
            .single()
          
          
          if (error) throw error
          
          if (sessionData) {
            // Initialize session info
            const sessionInfo: SessionInfo = {
              id: sessionData.id,
              status: sessionData.status,
              error: sessionData.error,
              completedAt: sessionData.completed_at
            }
            
            set(state => ({
              sessions: new Map(state.sessions).set(sessionId, sessionInfo)
            }))
            
            // Load events from orchestration_events table
            const { data: eventsData, error: eventsError } = await supabase
              .from('orchestration_events')
              .select('*')
              .eq('session_id', sessionId)
              .order('created_at', { ascending: true })
            
            
            if (eventsData && eventsData.length > 0) {
              const events = eventsData as OrchestrationEvent[]
              get().processSessionEvents(sessionId, events)
            }
          }
          
          // Subscribe to realtime updates
          get().subscribeToSession(sessionId)
          
        } finally {
          set(state => ({
            loadingStates: new Map(state.loadingStates).set(sessionId, false)
          }))
        }
      },
      
      clearSession: (sessionId) => {
        get().unsubscribeFromSession(sessionId)
        
        set(state => ({
          eventsBySession: new Map(state.eventsBySession).set(sessionId, []),
          agentsBySession: new Map(state.agentsBySession).set(sessionId, new Map()),
          discussionsBySession: new Map(state.discussionsBySession).set(sessionId, []),
          toolCallsBySession: new Map(state.toolCallsBySession).set(sessionId, new Map()),
          toolResultsBySession: new Map(state.toolResultsBySession).set(sessionId, new Map()),
          artifactsBySession: new Map(state.artifactsBySession).set(sessionId, [])
        }))
      },
      
      addEvent: (sessionId, event) => {
        set(state => {
          const events = state.eventsBySession.get(sessionId) || []
          return {
            eventsBySession: new Map(state.eventsBySession).set(sessionId, [...events, event])
          }
        })
        
        // Process event for side effects
        get().processRealtimeEvent(sessionId, event)
      },
      
      processRealtimeEvent: (sessionId, event) => {
        const state = get()
        const data = event.event_data
        
        switch (event.event_type) {
          case 'status_update':
            if (data.status || data.to) {
              set(state => {
                const session = state.sessions.get(sessionId)
                if (session) {
                  return {
                    sessions: new Map(state.sessions).set(sessionId, {
                      ...session,
                      status: data.status || data.to
                    })
                  }
                }
                return state
              })
            }
            break
            
          case 'tool_call':
            if (data.tool && data.tool_call_id) {
              const toolCall: ToolCall = {
                tool: data.tool,
                arguments: data.arguments,
                tool_call_id: data.tool_call_id,
                timestamp: event.created_at
              }
              
              set(state => {
                const toolCalls = state.toolCallsBySession.get(sessionId) || new Map()
                return {
                  toolCallsBySession: new Map(state.toolCallsBySession).set(
                    sessionId,
                    new Map(toolCalls).set(data.tool_call_id, toolCall)
                  )
                }
              })
            }
            break
            
          case 'tool_result':
            if (data.tool_call_id) {
              const toolResult: ToolResult = {
                success: data.success,
                result: data.result,
                error: data.error,
                duration_ms: data.duration_ms,
                tool_call_id: data.tool_call_id,
                summary: data.summary  // Include AI-generated summary if present
              }
              
              set(state => {
                const toolResults = state.toolResultsBySession.get(sessionId) || new Map()
                return {
                  toolResultsBySession: new Map(state.toolResultsBySession).set(
                    sessionId,
                    new Map(toolResults).set(data.tool_call_id, toolResult)
                  )
                }
              })
              
              // Check if this is a runDiscussion tool result with discussion data
              // We need to look up the tool call to see which tool it was
              const toolCalls = get().toolCallsBySession.get(sessionId)
              const toolCall = toolCalls?.get(data.tool_call_id)
              
              // Check for agent creation
              if (toolCall?.tool === 'createAgent' && data.success && data.result) {
                const agent: Agent = {
                  id: data.result.id || data.tool_call_id,
                  name: data.result.name || 'Agent',
                  specification: data.result.specification || toolCall.arguments?.specification || '',
                  expertise: data.result.expertise,
                  persona: data.result.persona,
                  thoughts: []
                }
                
                set(state => {
                  const agents = state.agentsBySession.get(sessionId) || new Map()
                  return {
                    agentsBySession: new Map(state.agentsBySession).set(
                      sessionId,
                      new Map(agents).set(agent.id, agent)
                    )
                  }
                })
              }
              
              if (toolCall?.tool === 'runDiscussion' && data.success && data.result?.discussion) {
                const discussionData = data.result
                set(state => {
                  const discussions = state.discussionsBySession.get(sessionId) || []
                  
                  // Create a new discussion from the tool result
                  const discussion: Discussion = {
                    id: data.tool_call_id, // Use tool_call_id as discussion id
                    topic: discussionData.topic || 'Discussion',
                    style: discussionData.style || 'collaborative',
                    turns: discussionData.discussion.map((turn: any) => ({
                      agent_id: turn.agent,
                      agent_name: turn.agent,
                      message: turn.content,
                      round: turn.round,
                      timestamp: turn.timestamp || event.created_at
                    }))
                  }
                  
                  return {
                    discussionsBySession: new Map(state.discussionsBySession).set(
                      sessionId,
                      [...discussions, discussion]
                    )
                  }
                })
              }
              
              // Detect and extract artifacts
              get().detectAndExtractArtifacts(sessionId, toolResult)
            }
            break
            
          case 'agent_thought':
            if (data.agent_id && data.thought) {
              set(state => {
                const agents = state.agentsBySession.get(sessionId) || new Map()
                const agent = agents.get(data.agent_id)
                if (agent) {
                  const thought: AgentThought = {
                    thought: data.thought || data.content || '',
                    is_key_decision: data.is_key_decision || false,
                    thought_type: data.thought_type || 'general',
                    timestamp: event.created_at
                  }
                  
                  const updatedAgent = {
                    ...agent,
                    thoughts: [...agent.thoughts, thought]
                  }
                  
                  return {
                    agentsBySession: new Map(state.agentsBySession).set(
                      sessionId,
                      new Map(agents).set(data.agent_id, updatedAgent)
                    )
                  }
                }
                return state
              })
            }
            break
            
          case 'discussion_turn':
            if (data.discussion_id && data.agent_name && data.message) {
              set(state => {
                const discussions = state.discussionsBySession.get(sessionId) || []
                let discussion = discussions.find(d => d.id === data.discussion_id)
                
                if (!discussion) {
                  discussion = {
                    id: data.discussion_id,
                    topic: data.topic || 'Discussion',
                    style: data.style || 'collaborative',
                    turns: []
                  }
                  discussions.push(discussion)
                }
                
                const turn: DiscussionTurn = {
                  agent_id: data.agent_id,
                  agent_name: data.agent_name,
                  message: data.message,
                  round: data.round || 1,
                  timestamp: event.created_at
                }
                
                discussion.turns.push(turn)
                
                return {
                  discussionsBySession: new Map(state.discussionsBySession).set(sessionId, discussions)
                }
              })
            }
            break
        }
      },
      
      processSessionEvents: (sessionId: string, events: OrchestrationEvent[]) => {
        // Process all events in order
        events.forEach(event => {
          get().addEvent(sessionId, event)
        })
      },
      
      detectAndExtractArtifacts: (sessionId, toolResult) => {
        if (!toolResult.result || !toolResult.success) return
        
        const checkContent = (content: any, source: Artifact['source']) => {
          const artifactType = detectArtifactType(content)
          if (artifactType) {
            const artifact: Artifact = {
              id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: artifactType,
              title: extractArtifactTitle(content, artifactType),
              content: content,
              source: source,
              metadata: {
                detectedAt: new Date().toISOString()
              }
            }
            
            get().addArtifact(sessionId, artifact)
          }
        }
        
        // Check direct result
        checkContent(toolResult.result, { toolCallId: toolResult.tool_call_id })
        
        // Check nested properties that commonly contain artifacts
        if (typeof toolResult.result === 'object' && toolResult.result !== null) {
          const checkKeys = ['content', 'output', 'visualization', 'diagram', 'chart', 'document', 'markdown', 'html', 'svg']
          
          for (const key of checkKeys) {
            if (key in toolResult.result) {
              checkContent(toolResult.result[key], { toolCallId: toolResult.tool_call_id })
            }
          }
          
          // Check agent responses
          if (toolResult.result.response) {
            checkContent(toolResult.result.response, { 
              toolCallId: toolResult.tool_call_id,
              agentId: toolResult.result.agent_id 
            })
          }
          
          // Check discussion turns
          if (Array.isArray(toolResult.result.turns)) {
            toolResult.result.turns.forEach((turn: any) => {
              if (turn.message) {
                checkContent(turn.message, {
                  toolCallId: toolResult.tool_call_id,
                  discussionId: toolResult.result.discussion_id
                })
              }
            })
          }
        }
      },
      
      addArtifact: (sessionId, artifact) => {
        set(state => {
          const artifacts = state.artifactsBySession.get(sessionId) || []
          return {
            artifactsBySession: new Map(state.artifactsBySession).set(
              sessionId,
              [...artifacts, artifact]
            )
          }
        })
      },
      
      subscribeToSession: (sessionId) => {
        const { subscriptions } = get()
        
        // Don't subscribe twice
        if (subscriptions.has(sessionId)) return
        
        const supabase = getBrowserClient()
        const channel = supabase
          .channel(`orchestration-${sessionId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'orchestration_events',
              filter: `session_id=eq.${sessionId}`
            },
            (payload) => {
              const event = payload.new as OrchestrationEvent
              get().addEvent(sessionId, event)
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orchestration_sessions',
              filter: `id=eq.${sessionId}`
            },
            (payload) => {
              const session = payload.new
              set(state => ({
                sessions: new Map(state.sessions).set(sessionId, {
                  id: session.id,
                  status: session.status,
                  error: session.error,
                  completedAt: session.completed_at
                })
              }))
            }
          )
          .subscribe()
        
        set(state => ({
          subscriptions: new Map(state.subscriptions).set(sessionId, channel)
        }))
      },
      
      unsubscribeFromSession: (sessionId) => {
        const { subscriptions } = get()
        const channel = subscriptions.get(sessionId)
        
        if (channel) {
          channel.unsubscribe()
          set(state => {
            const newSubs = new Map(state.subscriptions)
            newSubs.delete(sessionId)
            return { subscriptions: newSubs }
          })
        }
      },
      
      // UI state management
      toggleSection: (sessionId, section) => {
        set(state => {
          const sections = state.expandedSectionsBySession.get(sessionId) || new Set(['status', 'timeline'])
          const newSections = new Set(sections)
          
          if (newSections.has(section)) {
            newSections.delete(section)
          } else {
            newSections.add(section)
          }
          
          return {
            expandedSectionsBySession: new Map(state.expandedSectionsBySession).set(sessionId, newSections)
          }
        })
      },
      
      toggleAgent: (sessionId, agentId) => {
        set(state => {
          const agents = state.expandedAgentsBySession.get(sessionId) || new Set()
          const newAgents = new Set(agents)
          
          if (newAgents.has(agentId)) {
            newAgents.delete(agentId)
          } else {
            newAgents.add(agentId)
          }
          
          return {
            expandedAgentsBySession: new Map(state.expandedAgentsBySession).set(sessionId, newAgents)
          }
        })
      },
      
      setTimelineSort: (sessionId, sort) => {
        set(state => ({
          timelineSortBySession: new Map(state.timelineSortBySession).set(sessionId, sort)
        }))
      },
      
      // ChatInterface state management
      setCurrentOrchestrationId: (orchestrationId) => {
        set({ currentOrchestrationId: orchestrationId })
      },
      
      setShowOrchestrationPanel: (show) => {
        set({ showOrchestrationPanel: show })
      },
      
      addOrchestrationToThread: (threadId, orchestrationId) => {
        set(state => {
          const orchestrations = state.orchestrationsByThread.get(threadId) || []
          if (!orchestrations.includes(orchestrationId)) {
            return {
              orchestrationsByThread: new Map(state.orchestrationsByThread).set(
                threadId,
                [...orchestrations, orchestrationId]
              )
            }
          }
          return state
        })
      },
      
      loadOrchestrationsByThread: async (threadId) => {
        const supabase = getBrowserClient()
        
        try {
          // Find all orchestration sessions for this thread
          const { data: sessions, error } = await supabase
            .from('orchestration_sessions')
            .select('id, status, created_at')
            .contains('tool_state', { thread_id: threadId })
            .order('created_at', { ascending: false })
          
          if (error) throw error
          
          if (sessions && sessions.length > 0) {
            set(state => ({
              orchestrationsByThread: new Map(state.orchestrationsByThread).set(
                threadId,
                sessions.map(s => s.id)
              )
            }))
            
            // Load the active session if any
            const activeSession = sessions.find(s => 
              ['pending', 'running', 'resuming'].includes(s.status)
            )
            
            if (activeSession) {
              set({ currentOrchestrationId: activeSession.id })
              get().loadSession(activeSession.id)
            }
          }
        } catch (error) {
          console.error('Failed to load orchestrations by thread:', error)
        }
      },
      
      // Thread management
      setSelectedThreadId: (threadId) => {
        set({ selectedThreadId: threadId })
      },
      
      getSessionData: (sessionId) => {
        const state = get()
        
        return {
          info: state.sessions.get(sessionId),
          events: state.eventsBySession.get(sessionId) || [],
          agents: Array.from(state.agentsBySession.get(sessionId)?.values() || []),
          discussions: state.discussionsBySession.get(sessionId) || [],
          toolCalls: Array.from(state.toolCallsBySession.get(sessionId)?.values() || []),
          toolResults: state.toolResultsBySession.get(sessionId) || new Map(),
          artifacts: state.artifactsBySession.get(sessionId) || []
        }
      },
      
      getUIState: (sessionId) => {
        const state = get()
        
        return {
          expandedSections: state.expandedSectionsBySession.get(sessionId) || new Set(['status', 'timeline']),
          expandedAgents: state.expandedAgentsBySession.get(sessionId) || new Set(),
          timelineSort: state.timelineSortBySession.get(sessionId) || 'newest'
        }
      },
      
      getOrchestrationsByThread: (threadId) => {
        const state = get()
        return state.orchestrationsByThread.get(threadId) || []
      }
    }))
  )
)