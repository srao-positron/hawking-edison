import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'

export interface OrchestrationEvent {
  type: string
  data: any
  timestamp: string
}

export interface OrchestrationState {
  sessionId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'resuming'
  events: OrchestrationEvent[]
  currentTools: Map<string, { tool: string; status: 'running' | 'completed' | 'failed'; startTime: string }>
  agents: Map<string, { name: string; specification: string; thoughts: any[] }>
  error?: string
  finalResponse?: any
  isConnected: boolean
}

interface UseOrchestrationStreamOptions {
  onEvent?: (event: OrchestrationEvent) => void
  onComplete?: (finalResponse: any) => void
  onError?: (error: string) => void
}

export function useOrchestrationStream(
  sessionId: string | null,
  options: UseOrchestrationStreamOptions = {}
) {
  const { user } = useAuth()
  const [state, setState] = useState<OrchestrationState>({
    sessionId: sessionId || '',
    status: 'pending',
    events: [],
    currentTools: new Map(),
    agents: new Map(),
    isConnected: false,
  })
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const connect = useCallback(() => {
    if (!sessionId || !user) return

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/orchestration-stream`)
      url.searchParams.set('sessionId', sessionId)

      const eventSource = new EventSource(url.toString(), {
        withCredentials: true,
      })

      eventSource.onopen = () => {
        console.log('Orchestration stream connected')
        setState(prev => ({ ...prev, isConnected: true }))
        reconnectAttemptsRef.current = 0
      }

      eventSource.onerror = (error) => {
        console.error('Orchestration stream error:', error)
        setState(prev => ({ ...prev, isConnected: false }))
        
        // Implement exponential backoff for reconnection
        const attempts = reconnectAttemptsRef.current
        if (attempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, attempts), 30000)
          console.log(`Reconnecting in ${delay}ms (attempt ${attempts + 1})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay)
        } else {
          setState(prev => ({ 
            ...prev, 
            error: 'Connection lost. Please refresh the page.' 
          }))
          options.onError?.('Connection lost')
        }
      }

      // Handle different event types
      eventSource.addEventListener('session_info', (event) => {
        const data = JSON.parse(event.data)
        setState(prev => ({
          ...prev,
          status: data.status,
          sessionId: data.sessionId,
        }))
      })

      eventSource.addEventListener('status', (event) => {
        const data = JSON.parse(event.data)
        setState(prev => ({
          ...prev,
          status: data.to,
          events: [...prev.events, { type: 'status', data, timestamp: data.timestamp }]
        }))
      })

      eventSource.addEventListener('tool_start', (event) => {
        const data = JSON.parse(event.data)
        setState(prev => {
          const newTools = new Map(prev.currentTools)
          newTools.set(data.toolCallId, {
            tool: data.tool,
            status: 'running',
            startTime: data.timestamp
          })
          return {
            ...prev,
            currentTools: newTools,
            events: [...prev.events, { type: 'tool_start', data, timestamp: data.timestamp }]
          }
        })
        options.onEvent?.({ type: 'tool_start', data, timestamp: data.timestamp })
      })

      eventSource.addEventListener('tool_complete', (event) => {
        const data = JSON.parse(event.data)
        setState(prev => {
          const newTools = new Map(prev.currentTools)
          const toolCall = Array.from(prev.currentTools.entries())
            .find(([_, tool]) => tool.tool === data.tool)
          
          if (toolCall) {
            newTools.delete(toolCall[0])
          }
          
          return {
            ...prev,
            currentTools: newTools,
            events: [...prev.events, { type: 'tool_complete', data, timestamp: data.timestamp }]
          }
        })
        options.onEvent?.({ type: 'tool_complete', data, timestamp: data.timestamp })
      })

      eventSource.addEventListener('agent_created', (event) => {
        const data = JSON.parse(event.data)
        setState(prev => {
          const newAgents = new Map(prev.agents)
          newAgents.set(data.agentId, {
            name: data.name,
            specification: data.specification,
            thoughts: []
          })
          return {
            ...prev,
            agents: newAgents,
            events: [...prev.events, { type: 'agent_created', data, timestamp: data.timestamp }]
          }
        })
        options.onEvent?.({ type: 'agent_created', data, timestamp: data.timestamp })
      })

      eventSource.addEventListener('agent_thought', (event) => {
        const data = JSON.parse(event.data)
        setState(prev => {
          const newAgents = new Map(prev.agents)
          const agent = newAgents.get(data.agentId)
          if (agent) {
            agent.thoughts.push({
              thought: data.thought,
              isKeyDecision: data.isKeyDecision,
              thoughtType: data.thoughtType,
              timestamp: data.timestamp
            })
          }
          return {
            ...prev,
            agents: newAgents,
            events: [...prev.events, { type: 'agent_thought', data, timestamp: data.timestamp }]
          }
        })
        options.onEvent?.({ type: 'agent_thought', data, timestamp: data.timestamp })
      })

      eventSource.addEventListener('complete', (event) => {
        const data = JSON.parse(event.data)
        setState(prev => ({
          ...prev,
          status: data.status as any,
          finalResponse: data.finalResponse,
          error: data.error,
          isConnected: false
        }))
        options.onComplete?.(data.finalResponse)
        eventSource.close()
      })

      eventSource.addEventListener('error', (event: MessageEvent) => {
        const data = JSON.parse(event.data)
        setState(prev => ({
          ...prev,
          error: data.error,
          events: [...prev.events, { type: 'error', data, timestamp: data.timestamp }]
        }))
        options.onError?.(data.error)
      })

      eventSource.addEventListener('heartbeat', () => {
        // Just acknowledge we're still connected
        console.log('Heartbeat received')
      })

      // Store ref for cleanup
      eventSourceRef.current = eventSource

    } catch (error) {
      console.error('Failed to create EventSource:', error)
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to connect to orchestration stream',
        isConnected: false 
      }))
    }
  }, [sessionId, user, options])

  // Connect when sessionId changes
  useEffect(() => {
    if (sessionId) {
      connect()
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [sessionId, connect])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    setState(prev => ({ ...prev, isConnected: false }))
  }, [])

  return {
    ...state,
    disconnect,
    reconnect: connect
  }
}