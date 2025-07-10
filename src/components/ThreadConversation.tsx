'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, Brain, Wrench, Eye } from 'lucide-react'
import { api } from '@/lib/api-client'
import ThinkingProcess from './ThinkingProcess'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    toolCalls?: Array<{
      tool: string
      params: any
      result?: any
    }>
    thinking?: string
    sessionId?: string
  }
}

interface StreamEvent {
  event: string
  data: any
}

interface ThreadConversationProps {
  threadId: string
  onToolExecution?: (tool: string, params: any, result: any) => void
  onThinking?: (thought: string) => void
}

export default function ThreadConversation({ 
  threadId, 
  onToolExecution,
  onThinking 
}: ThreadConversationProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentThought, setCurrentThought] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Load thread messages on mount
  useEffect(() => {
    loadThreadMessages()
  }, [threadId])

  const loadThreadMessages = async () => {
    try {
      const { messages } = await api.threads.getMessages(threadId)
      setMessages(messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.created_at)
      })))
    } catch (error) {
      console.error('Failed to load thread messages:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const handleStreamEvent = useCallback((event: StreamEvent) => {
    switch (event.event) {
      case 'session_start':
        console.log('Session started:', event.data.sessionId)
        break
      
      case 'thinking':
        setCurrentThought(event.data.content)
        if (onThinking) {
          onThinking(event.data.content)
        }
        break
      
      case 'tool_start':
        setCurrentThought(`Preparing to use ${event.data.tool}...`)
        break
      
      case 'tool_execute':
        if (onToolExecution) {
          onToolExecution(event.data.tool, event.data.params, null)
        }
        break
      
      case 'tool_complete':
        if (onToolExecution) {
          onToolExecution(event.data.tool, null, event.data.result)
        }
        break
      
      case 'token':
        setStreamingContent(prev => prev + event.data.content)
        break
      
      case 'complete':
        // Finalize the streaming message
        if (streamingContent) {
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: streamingContent,
            timestamp: new Date(),
            metadata: {
              sessionId: event.data.sessionId
            }
          }
          setMessages(prev => [...prev, assistantMessage])
          setStreamingContent('')
        }
        setCurrentThought(null)
        setIsStreaming(false)
        break
      
      case 'error':
        console.error('Stream error:', event.data.message)
        setIsStreaming(false)
        setCurrentThought(null)
        break
    }
  }, [streamingContent, onToolExecution, onThinking])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)
    setStreamingContent('')

    try {
      // Close any existing EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      // Create new EventSource for streaming
      const eventSource = await api.interactStream(threadId, input.trim())
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleStreamEvent({ event: event.type || 'message', data })
        } catch (error) {
          console.error('Failed to parse SSE data:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error)
        eventSource.close()
        setIsStreaming(false)
        setCurrentThought(null)
        
        // Add error message
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'I apologize, but I encountered an error processing your request. Please try again.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }

      // Custom event listeners
      const events = ['session_start', 'thinking', 'tool_start', 'tool_execute', 'tool_complete', 'token', 'complete', 'error']
      events.forEach(eventType => {
        eventSource.addEventListener(eventType, (event: any) => {
          try {
            const data = JSON.parse(event.data)
            handleStreamEvent({ event: eventType, data })
          } catch (error) {
            console.error(`Failed to parse ${eventType} event:`, error)
          }
        })
      })

    } catch (error) {
      console.error('Failed to start streaming:', error)
      setIsStreaming(false)
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I apologize, but I couldn\'t connect to the streaming service. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-8 px-4">
          {/* Thinking Process Widget */}
          {messages.length > 0 && (
            <div className="mb-6">
              <ThinkingProcess threadId={threadId} />
            </div>
          )}
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-xl font-medium text-gray-700 mb-8">
                  <Sparkles className="w-6 h-6 text-orange-500" />
                  <span>What can I help you with today?</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.role === 'assistant' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-[80%] ${
                      message.role === 'assistant'
                        ? 'order-2'
                        : 'order-1'
                    }`}
                  >
                    <div
                      className={`rounded-lg px-4 py-3 ${
                        message.role === 'assistant'
                          ? 'bg-white border border-gray-200'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 px-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  {message.role === 'assistant' && (
                    <div className="order-1 w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium">H</span>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Streaming Message */}
              {isStreaming && streamingContent && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium">H</span>
                  </div>
                  <div className="max-w-[80%]">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                      <p className="whitespace-pre-wrap">{streamingContent}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Loading State */}
              {isStreaming && !streamingContent && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium">H</span>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Current Thought */}
              {currentThought && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div className="max-w-[80%]">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                      <p className="text-sm text-purple-700 italic">{currentThought}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="How can I help you today?"
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white"
              rows={1}
              style={{ maxHeight: '200px' }}
              disabled={isStreaming}
            />
            
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className={`p-2 rounded-lg transition-colors ${
                  input.trim() && !isStreaming
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'text-gray-300'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-400 text-center">
            Hawking Edison can make mistakes. Check important info.
          </div>
        </form>
      </div>
    </div>
  )
}