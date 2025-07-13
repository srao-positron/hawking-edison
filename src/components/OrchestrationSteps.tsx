'use client'

import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Zap, 
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface OrchestrationEvent {
  id: string
  session_id: string
  thread_id: string | null
  event_type: string
  event_data: any
  metadata: any
  created_at: string
}

interface OrchestrationStepsProps {
  sessionId: string
  isMinimized?: boolean
}

export default function OrchestrationSteps({ sessionId, isMinimized = false }: OrchestrationStepsProps) {
  const [events, setEvents] = useState<OrchestrationEvent[]>([])
  const [isExpanded, setIsExpanded] = useState(!isMinimized)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = getBrowserClient()
    
    // Load existing events
    loadEvents()
    
    // Subscribe to new events
    const channel = supabase
      .channel(`orchestration-events:${sessionId}`)
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
          setEvents(prev => [...prev, newEvent])
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])
  
  const loadEvents = async () => {
    const supabase = getBrowserClient()
    const { data, error } = await supabase
      .from('orchestration_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    
    if (!error && data) {
      setEvents(data)
    }
    setIsLoading(false)
  }
  
  const getEventIcon = (eventType: string, eventData: any) => {
    switch (eventType) {
      case 'tool_call':
        return <Activity className="w-4 h-4 text-blue-500" />
      case 'tool_result':
        return eventData.success ? 
          <CheckCircle className="w-4 h-4 text-green-500" /> :
          <XCircle className="w-4 h-4 text-red-500" />
      case 'verification':
        return eventData.achieved ?
          <CheckCircle className="w-4 h-4 text-green-500" /> :
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'retry':
        return <RefreshCw className="w-4 h-4 text-orange-500" />
      case 'status_update':
        return <Zap className="w-4 h-4 text-purple-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'context_compression':
        return <FileText className="w-4 h-4 text-gray-500" />
      default:
        return <Activity className="w-4 h-4 text-gray-400" />
    }
  }
  
  const formatEventTitle = (event: OrchestrationEvent) => {
    const { event_type, event_data } = event
    
    switch (event_type) {
      case 'tool_call':
        return `Calling ${event_data.tool}`
      case 'tool_result':
        return `${event_data.tool} ${event_data.success ? 'completed' : 'failed'}`
      case 'verification':
        return `Verification ${event_data.achieved ? 'passed' : 'failed'}`
      case 'retry':
        return 'Retrying...'
      case 'status_update':
        return `Status: ${event_data.to}`
      case 'error':
        return 'Error occurred'
      case 'context_compression':
        return 'Context compressed'
      default:
        return event_type
    }
  }
  
  const formatEventDetail = (event: OrchestrationEvent) => {
    const { event_type, event_data } = event
    
    switch (event_type) {
      case 'tool_call':
        return `Arguments: ${JSON.stringify(event_data.arguments, null, 2)}`
      case 'tool_result':
        if (event_data.duration_ms) {
          return `Duration: ${event_data.duration_ms}ms`
        }
        return event_data.error || 'Completed successfully'
      case 'verification':
        return `Confidence: ${(event_data.confidence * 100).toFixed(0)}%${
          event_data.issues?.length ? `\nIssues: ${event_data.issues.join(', ')}` : ''
        }`
      case 'retry':
        return event_data.reason || 'Retrying operation'
      case 'status_update':
        return event_data.message || `Changed from ${event_data.from} to ${event_data.to}`
      case 'error':
        return event_data.error || 'Unknown error'
      case 'context_compression':
        return `Compressed ${event_data.original_message_count} messages to ${event_data.compressed_message_count}`
      default:
        return JSON.stringify(event_data, null, 2)
    }
  }
  
  if (isLoading && events.length === 0) {
    return null
  }
  
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Orchestration Steps
          </span>
          {events.length > 0 && (
            <span className="text-xs text-gray-500">
              ({events.length} events)
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className="border-t border-gray-200 max-h-64 overflow-y-auto">
          {events.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No orchestration events yet...
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {events.map((event) => (
                <div key={event.id} className="px-4 py-2 hover:bg-gray-50">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {getEventIcon(event.event_type, event.event_data)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700">
                        {formatEventTitle(event)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">
                        {formatEventDetail(event)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(event.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}