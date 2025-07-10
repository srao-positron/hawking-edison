'use client'

import { useState, useEffect } from 'react'
import { Brain, Zap, Target, Lightbulb, Cog, ChevronDown, ChevronRight } from 'lucide-react'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'

interface Thought {
  id: string
  type: 'planning' | 'reasoning' | 'decision' | 'reflection' | 'tool_selection'
  content: string
  timestamp: Date
  metadata?: any
}

interface ThinkingProcessProps {
  threadId: string
  sessionId?: string
}

export default function ThinkingProcess({ threadId, sessionId }: ThinkingProcessProps) {
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeThought, setActiveThought] = useState<string | null>(null)

  // Subscribe to thinking updates
  useRealtimeSubscription({
    channel: `thinking_${threadId}`,
    table: 'llm_thoughts',
    event: 'INSERT',
    filter: `thread_id=eq.${threadId}`,
    onInsert: (payload) => {
      const newThought: Thought = {
        id: payload.new.id,
        type: payload.new.thought_type,
        content: payload.new.content,
        timestamp: new Date(payload.new.created_at),
        metadata: payload.new.metadata
      }
      setThoughts(prev => [...prev, newThought])
      setActiveThought(newThought.id)
      
      // Clear active thought after 3 seconds
      setTimeout(() => {
        setActiveThought(current => current === newThought.id ? null : current)
      }, 3000)
    }
  })

  const getIcon = (type: Thought['type']) => {
    switch (type) {
      case 'planning':
        return <Target className="w-4 h-4" />
      case 'reasoning':
        return <Brain className="w-4 h-4" />
      case 'decision':
        return <Lightbulb className="w-4 h-4" />
      case 'reflection':
        return <Cog className="w-4 h-4" />
      case 'tool_selection':
        return <Zap className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: Thought['type']) => {
    switch (type) {
      case 'planning':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'reasoning':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'decision':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'reflection':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'tool_selection':
        return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const getTypeLabel = (type: Thought['type']) => {
    switch (type) {
      case 'planning':
        return 'Planning'
      case 'reasoning':
        return 'Reasoning'
      case 'decision':
        return 'Decision'
      case 'reflection':
        return 'Reflection'
      case 'tool_selection':
        return 'Tool Selection'
    }
  }

  if (thoughts.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="text-sm font-medium text-gray-900">Thinking Process</h3>
          <span className="text-xs text-gray-500">({thoughts.length} thoughts)</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="space-y-2">
            {thoughts.map((thought) => (
              <div
                key={thought.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                  activeThought === thought.id
                    ? 'scale-[1.02] shadow-md'
                    : ''
                } ${getTypeColor(thought.type)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(thought.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {getTypeLabel(thought.type)}
                    </span>
                    <span className="text-xs opacity-60">
                      {thought.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">
                    {thought.content}
                  </p>
                  {thought.metadata && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer hover:underline">
                        View metadata
                      </summary>
                      <pre className="mt-1 text-xs bg-white bg-opacity-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(thought.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Active thinking indicator */}
          {activeThought && (
            <div className="mt-3 flex items-center gap-2 text-xs text-purple-600">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
              <span>Processing...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}