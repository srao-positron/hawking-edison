'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Sparkles } from 'lucide-react'
import { api } from '@/lib/api-client'
import { getBrowserClient } from '@/lib/supabase-browser'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  tokens?: number
  error?: boolean
}

interface ChatInterfaceProps {
  sessionId?: string | null
  onThreadCreated?: (threadId: string) => void
}

export default function ChatInterface({ sessionId, onThreadCreated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Keep track of the previous sessionId to avoid unnecessary reloads
  const prevSessionIdRef = useRef<string | null>(null)
  
  // Load messages when sessionId changes
  useEffect(() => {
    // Only load if sessionId actually changed
    if (sessionId && sessionId !== prevSessionIdRef.current) {
      // Don't load messages if this is a new thread (messages will be empty anyway)
      const isNewThread = sessionId.includes('-') && messages.length > 0 && 
                         messages[messages.length - 1].role === 'assistant'
      
      if (!isNewThread) {
        loadThreadMessages()
      }
      prevSessionIdRef.current = sessionId
    } else if (!sessionId) {
      setMessages([])
      prevSessionIdRef.current = null
    }
    setIsLoading(false)
  }, [sessionId])
  
  const loadThreadMessages = async () => {
    if (!sessionId) return
    
    try {
      const { thread, messages: threadMessages } = await api.threads.get(sessionId)
      if (threadMessages && threadMessages.length > 0) {
        setMessages(threadMessages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          tokens: msg.tokens_used
        })))
      }
    } catch (error) {
      console.error('Failed to load thread messages:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await api.interact(input.trim(), { 
        sessionId: sessionId || undefined 
      })
      
      console.log('API Response:', response) // Debug log
      
      // If a new thread was created, notify parent
      if (response.isNewThread && response.threadId && onThreadCreated) {
        onThreadCreated(response.threadId)
      }
      
      // Check if this is an async response (status: 'processing' indicates async)
      if ((response.async || response.status === 'processing') && response.sessionId) {
        // Create a placeholder message with thinking indicator
        const thinkingMessage: Message = {
          id: response.sessionId,
          role: 'assistant',
          content: '🤔 Thinking...',
          timestamp: new Date(),
          error: false
        }
        setMessages(prev => [...prev, thinkingMessage])
        
        // Use Supabase Realtime to subscribe to orchestration updates
        const supabase = getBrowserClient()
        const channel = supabase
          .channel(`orchestration:${response.sessionId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orchestration_sessions',
              filter: `id=eq.${response.sessionId}`
            },
            (payload) => {
              console.log('Orchestration update:', payload)
              const session = payload.new as any
              
              if (session.status === 'completed' && session.final_response) {
                try {
                  const finalResponse = JSON.parse(session.final_response)
                  // Update the thinking message with the actual response
                  setMessages(prev => prev.map(msg => 
                    msg.id === response.sessionId
                      ? { 
                          ...msg, 
                          content: finalResponse.content || finalResponse,
                          timestamp: new Date()
                        }
                      : msg
                  ))
                } catch (e) {
                  // If parsing fails, use the raw response
                  setMessages(prev => prev.map(msg => 
                    msg.id === response.sessionId
                      ? { 
                          ...msg, 
                          content: session.final_response,
                          timestamp: new Date()
                        }
                      : msg
                  ))
                }
                channel.unsubscribe()
                setIsLoading(false)
              } else if (session.status === 'failed') {
                // Handle error
                setMessages(prev => prev.map(msg => 
                  msg.id === response.sessionId
                    ? { 
                        ...msg, 
                        content: session.error || 'An error occurred processing your request.',
                        error: true,
                        timestamp: new Date()
                      }
                    : msg
                ))
                channel.unsubscribe()
                setIsLoading(false)
              } else if (session.status === 'running') {
                // Update status to show it's being processed
                setMessages(prev => prev.map(msg => 
                  msg.id === response.sessionId
                    ? { ...msg, content: '⚡ Processing...' }
                    : msg
                ))
              }
            }
          )
          .subscribe()
        
        // Store channel reference for cleanup
        const timeoutId = setTimeout(() => {
          // Timeout after 5 minutes
          channel.unsubscribe()
          setMessages(prev => prev.map(msg => 
            msg.id === response.sessionId
              ? { 
                  ...msg, 
                  content: 'Request timed out. Please try again.',
                  error: true,
                  timestamp: new Date()
                }
              : msg
          ))
          setIsLoading(false)
        }, 5 * 60 * 1000)
      } else {
        // Sync response (shouldn't happen anymore)
        const assistantMessage: Message = {
          id: response.interactionId || crypto.randomUUID(),
          role: 'assistant',
          content: response.response || 'No response received',
          timestamp: new Date(),
          tokens: response.usage?.totalTokens
        }
        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Chat error:', error) // Debug log
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        error: true
      }
      setMessages(prev => [...prev, errorMessage])
      setIsLoading(false)
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
                          ? 'bg-white border border-gray-200 text-gray-900'
                          : 'bg-blue-600 text-white'
                      } ${message.error ? 'border-red-300 bg-red-50 text-red-900' : ''}`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 px-1">
                      {message.timestamp.toLocaleTimeString()}
                      {message.tokens && ` • ${message.tokens} tokens`}
                    </div>
                  </div>
                  {message.role === 'assistant' && (
                    <div className="order-1 w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium">H</span>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium">H</span>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex gap-1">
                      <div key="dot-1" className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div key="dot-2" className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div key="dot-3" className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
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
              className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
              rows={1}
              style={{ maxHeight: '200px' }}
            />
            
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4 text-gray-400" />
              </button>
              
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`p-2 rounded-lg transition-colors ${
                  input.trim() && !isLoading
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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