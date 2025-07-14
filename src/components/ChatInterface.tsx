'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Sparkles, Info } from 'lucide-react'
import { api } from '@/lib/api-client'
import { getBrowserClient } from '@/lib/supabase-browser'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import OrchestrationPanel from './OrchestrationPanel'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  tokens?: number
  error?: boolean
  orchestrationSessionId?: string // Track which orchestration session this message belongs to
  hasAttachments?: boolean // Track if message has attachments like visualizations
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
  const [currentOrchestrationId, setCurrentOrchestrationId] = useState<string | null>(null)
  const [showOrchestrationPanel, setShowOrchestrationPanel] = useState(false)
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
        // Load messages first, THEN check for active orchestrations
        loadThreadMessages().then(() => {
          // Check for active orchestration sessions after messages are loaded
          checkActiveOrchestrations()
        })
      } else {
        // For new threads, just check active orchestrations
        checkActiveOrchestrations()
      }
      prevSessionIdRef.current = sessionId
    } else if (!sessionId) {
      setMessages([])
      prevSessionIdRef.current = null
      setIsLoading(false)
    }
  }, [sessionId])
  
  const loadThreadMessages = async () => {
    if (!sessionId) return
    
    try {
      console.log('[ChatInterface] Loading thread messages for:', sessionId)
      const response = await api.threads.get(sessionId)
      console.log('[ChatInterface] API response:', {
        hasThread: !!response?.thread,
        hasMessages: !!response?.messages,
        messageCount: response?.messages?.length,
        rawResponse: response
      })
      
      const { thread, messages: threadMessages } = response || {}
      
      console.log('[ChatInterface] Loaded thread messages:', {
        sessionId,
        messageCount: threadMessages?.length,
        messages: threadMessages?.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          hasMetadata: !!msg.metadata,
          metadata: msg.metadata,
          orchestrationSessionId: msg.metadata?.orchestration_session_id
        }))
      })
      
      if (threadMessages && threadMessages.length > 0) {
        const mappedMessages = threadMessages.map((msg: any) => {
          const mapped = {
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at),
            tokens: msg.tokens_used,
            orchestrationSessionId: msg.metadata?.orchestration_session_id
          }
          
          // Extra logging for assistant messages
          if (msg.role === 'assistant') {
            console.log('[ChatInterface] Mapping assistant message:', {
              id: msg.id,
              rawMetadata: msg.metadata,
              orchestrationSessionId: mapped.orchestrationSessionId,
              willShowDetails: !!mapped.orchestrationSessionId
            })
          }
          
          return mapped
        })
        
        console.log('[ChatInterface] Setting messages with orchestration IDs:', 
          mappedMessages.filter(m => m.orchestrationSessionId).map(m => ({
            id: m.id,
            role: m.role,
            orchestrationSessionId: m.orchestrationSessionId
          }))
        )
        
        setMessages(mappedMessages)
      }
    } catch (error) {
      console.error('Failed to load thread messages:', error)
    }
  }
  
  const checkActiveOrchestrations = async () => {
    if (!sessionId) return
    
    console.log('[ChatInterface] Checking for active orchestrations for thread:', sessionId)
    
    try {
      const supabase = getBrowserClient()
      
      // Find ALL orchestration sessions for this thread (not just active)
      const { data: allSessions, error } = await supabase
        .from('orchestration_sessions')
        .select('*')
        .contains('tool_state', { thread_id: sessionId })
        .order('created_at', { ascending: false })
      
      console.log('[ChatInterface] All orchestrations query result:', { 
        hasData: !!allSessions, 
        count: allSessions?.length,
        error: error?.message 
      })
      
      // Filter to only active sessions
      const activeSessions = allSessions?.filter(s => 
        ['pending', 'running', 'resuming'].includes(s.status)
      ) || []
      
      if (activeSessions.length > 0) {
        const activeSession = activeSessions[0]
        console.log('[ChatInterface] Found active orchestration session:', {
          id: activeSession.id,
          status: activeSession.status,
          toolState: activeSession.tool_state,
          messagesCount: activeSession.messages?.length
        })
        
        // Set current orchestration session
        setCurrentOrchestrationId(activeSession.id)
        
        // Find the last user message to get the context
        const userMessages = activeSession.messages?.filter((m: any) => m.role === 'user') || []
        const lastUserMessage = userMessages[userMessages.length - 1]
        
        console.log('[ChatInterface] Last user message:', lastUserMessage?.content?.substring(0, 50))
        
        // CRITICAL: Verify this orchestration is actually for THIS thread
        const orchestrationThreadId = activeSession.tool_state?.thread_id
        if (orchestrationThreadId !== sessionId) {
          console.warn('[ChatInterface] Orchestration session is for different thread!', {
            orchestrationThreadId,
            currentThreadId: sessionId
          })
          return
        }
        
        // Check if we already have a message for this orchestration
        const hasOrchestrationMessage = messages.some(msg => 
          msg.orchestrationSessionId === activeSession.id
        )
        
        console.log('[ChatInterface] Has orchestration message already:', hasOrchestrationMessage)
        
        if (!hasOrchestrationMessage) {
          // Only add thinking message if we don't have ANY assistant message yet
          const hasAnyAssistantMessage = messages.some(msg => msg.role === 'assistant')
          
          if (!hasAnyAssistantMessage && lastUserMessage) {
            // Only add the thinking message for the active orchestration
            const thinkingMessage: Message = {
              id: activeSession.id,
              role: 'assistant',
              content: activeSession.status === 'running' ? '⚡ Processing...' : '🤔 Thinking...',
              timestamp: new Date(activeSession.started_at || activeSession.created_at),
              error: false,
              orchestrationSessionId: activeSession.id
            }
            setMessages(prev => {
              console.log('[ChatInterface] Adding thinking message to UI with orchestrationSessionId:', activeSession.id)
              // Remove any existing thinking messages first
              const filtered = prev.filter(msg => 
                !(msg.role === 'assistant' && (msg.content === '🤔 Thinking...' || msg.content === '⚡ Processing...'))
              )
              return [...filtered, thinkingMessage]
            })
            
            // Set loading state
            setIsLoading(true)
            // Also set current orchestration ID
            setCurrentOrchestrationId(activeSession.id)
          } else {
            // We have messages already - just ensure the orchestrationSessionId is set
            console.log('[ChatInterface] Updating existing messages with orchestration ID')
            setCurrentOrchestrationId(activeSession.id)
            setIsLoading(true) // Also set loading for existing messages
          }
        }
        
        // Set up realtime subscription for the active session
        setupOrchestrationSubscription(activeSession.id)
      } else {
        console.log('[ChatInterface] No active orchestration sessions found')
      }
    } catch (error) {
      console.error('Failed to check active orchestrations:', error)
    }
  }
  
  const setupOrchestrationSubscription = (sessionId: string) => {
    console.log(`[ChatInterface] Setting up realtime subscription for session ${sessionId}`)
    const supabase = getBrowserClient()
    const channel = supabase
      .channel(`orchestration:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orchestration_sessions',
          filter: `id=eq.${sessionId}`
        },
        handleOrchestrationUpdate
      )
      .subscribe()
    
    // Store channel reference for cleanup
    ;(channel as any).orchestrationSessionId = sessionId
  }
  
  const handleOrchestrationUpdate = async (payload: any) => {
    const session = payload.new as any
    const sessionId = session.id
    
    console.log('[ChatInterface] Orchestration update received:', {
      sessionId,
      status: session.status,
      hasFinalResponse: !!session.final_response
    })
    
    if (session.status === 'completed') {
      // Fetch the complete session data
      const supabase = getBrowserClient()
      try {
        const { data: completeSession, error } = await supabase
          .from('orchestration_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()
        
        if (error || !completeSession) {
          throw new Error(`Failed to fetch complete session: ${error?.message}`)
        }
        
        if (completeSession.final_response) {
          const finalResponse = JSON.parse(completeSession.final_response)
          
          // Update the thinking message with the actual response
          setMessages(prev => prev.map(msg => 
            msg.id === sessionId
              ? { 
                  ...msg, 
                  content: finalResponse.content || finalResponse,
                  timestamp: new Date()
                }
              : msg
          ))
          
          // If a thread was created by the orchestrator, notify parent
          if (finalResponse.threadId && onThreadCreated && !sessionId) {
            onThreadCreated(finalResponse.threadId)
          }
        }
      } catch (e) {
        console.error('[ChatInterface] Error fetching complete session:', e)
      }
      
      setIsLoading(false)
      
      // Unsubscribe from this session's channel
      supabase.channel(`orchestration:${sessionId}`).unsubscribe()
    } else if (session.status === 'failed') {
      // Update message to show error
      setMessages(prev => prev.map(msg => 
        msg.id === sessionId
          ? { 
              ...msg, 
              content: session.error || 'An error occurred processing your request.',
              error: true,
              timestamp: new Date()
            }
          : msg
      ))
      setIsLoading(false)
      
      // Unsubscribe from this session's channel
      supabase.channel(`orchestration:${sessionId}`).unsubscribe()
    } else if (session.status === 'running') {
      // Update status to show it's being processed
      setMessages(prev => prev.map(msg => 
        msg.id === sessionId
          ? { ...msg, content: '⚡ Processing...' }
          : msg
      ))
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
      
      console.log('[ChatInterface] API Response:', {
        hasData: !!response.data,
        isNewThread: response.isNewThread,
        threadId: response.threadId,
        sessionId: response.sessionId || response.data?.sessionId,
        status: response.status || response.data?.status,
        async: response.async || response.data?.async
      })
      
      // If a new thread was created, notify parent
      if (response.isNewThread && response.threadId && onThreadCreated) {
        console.log('[ChatInterface] New thread created, notifying parent:', response.threadId)
        onThreadCreated(response.threadId)
      }
      
      // Check if this is an async response (status: 'processing' indicates async)
      // The Edge Function returns { success: true, data: { sessionId, status, ... } }
      const responseData = response.data || response
      if ((responseData.async || responseData.status === 'processing') && responseData.sessionId) {
        console.log('[ChatInterface] Async response detected, setting up realtime')
        
        // Set current orchestration session
        setCurrentOrchestrationId(responseData.sessionId)
        
        // Create a placeholder message with thinking indicator
        const thinkingMessage: Message = {
          id: responseData.sessionId,
          role: 'assistant',
          content: '🤔 Thinking...',
          timestamp: new Date(),
          error: false,
          orchestrationSessionId: responseData.sessionId
        }
        setMessages(prev => {
          // Remove any existing thinking messages first
          const filtered = prev.filter(msg => 
            !(msg.role === 'assistant' && (msg.content === '🤔 Thinking...' || msg.content === '⚡ Processing...'))
          )
          return [...filtered, thinkingMessage]
        })
        
        // Use Supabase Realtime to subscribe to orchestration updates
        console.log(`[ChatInterface] Setting up realtime subscription for session ${responseData.sessionId}`)
        const supabase = getBrowserClient()
        const channel = supabase
          .channel(`orchestration:${responseData.sessionId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orchestration_sessions',
              filter: `id=eq.${responseData.sessionId}`
            },
            (payload) => {
              console.log('[ChatInterface] Orchestration update received:', {
                eventType: payload.eventType,
                status: payload.new?.status,
                hasFinalResponse: !!payload.new?.final_response,
                finalResponseLength: payload.new?.final_response?.length,
                timestamp: new Date().toISOString()
              })
              const session = payload.new as any
              
              if (session.status === 'completed') {
                // Fetch the complete session data since realtime might truncate large text fields
                const fetchCompleteSession = async () => {
                  console.log(`[ChatInterface] Session completed, fetching full data for ${responseData.sessionId}`)
                  try {
                    const { data: completeSession, error } = await supabase
                      .from('orchestration_sessions')
                      .select('*')
                      .eq('id', responseData.sessionId)
                      .single()
                    
                    console.log('[ChatInterface] Fetched complete session:', {
                      hasData: !!completeSession,
                      hasFinalResponse: !!completeSession?.final_response,
                      finalResponseLength: completeSession?.final_response?.length,
                      error
                    })
                    
                    if (error || !completeSession) {
                      throw new Error(`Failed to fetch complete session: ${error?.message}`)
                    }
                    
                    if (completeSession.final_response) {
                      const finalResponse = JSON.parse(completeSession.final_response)
                      console.log('[ChatInterface] Parsed final response:', {
                        hasContent: !!finalResponse.content,
                        hasThreadId: !!finalResponse.threadId,
                        contentPreview: finalResponse.content?.substring(0, 100) + '...'
                      })
                      // Update the thinking message with the actual response
                      setMessages(prev => prev.map(msg => 
                        msg.id === responseData.sessionId
                          ? { 
                              ...msg, 
                              content: finalResponse.content || finalResponse,
                              timestamp: new Date()
                            }
                          : msg
                      ))
                      
                      // If a thread was created by the orchestrator, notify parent
                      if (finalResponse.threadId && onThreadCreated && !sessionId) {
                        console.log('[ChatInterface] Notifying parent of new thread:', finalResponse.threadId)
                        onThreadCreated(finalResponse.threadId)
                      }
                    } else {
                      console.warn('[ChatInterface] Complete session has no final_response')
                    }
                  } catch (e) {
                    console.error('[ChatInterface] Error fetching complete session:', e)
                    // Fallback to the truncated response if available
                    if (session.final_response) {
                      try {
                        const finalResponse = JSON.parse(session.final_response)
                        setMessages(prev => prev.map(msg => 
                          msg.id === responseData.sessionId
                            ? { 
                                ...msg, 
                                content: finalResponse.content || finalResponse,
                                timestamp: new Date()
                              }
                            : msg
                        ))
                      } catch (parseError) {
                        // If parsing fails, use the raw response
                        setMessages(prev => prev.map(msg => 
                          msg.id === responseData.sessionId
                            ? { 
                                ...msg, 
                                content: session.final_response || 'Response completed',
                                timestamp: new Date()
                              }
                            : msg
                        ))
                      }
                    }
                  }
                  
                  // Clear timeout
                  if ((channel as any).timeoutId) {
                    clearTimeout((channel as any).timeoutId)
                  }
                  channel.unsubscribe()
                  setIsLoading(false)
                }
                
                fetchCompleteSession()
              } else if (session.status === 'failed') {
                // Handle error
                setMessages(prev => prev.map(msg => 
                  msg.id === responseData.sessionId
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
                  msg.id === responseData.sessionId
                    ? { ...msg, content: '⚡ Processing...' }
                    : msg
                ))
              } else {
                console.log(`[ChatInterface] Unhandled session status: ${session.status}`)
              }
            }
          )
          .subscribe((status) => {
            console.log(`[ChatInterface] Realtime subscription status: ${status}`)
          })
        
        // Store timeout for cleanup
        const timeoutId = setTimeout(() => {
          // Timeout after 5 minutes
          channel.unsubscribe()
          setMessages(prev => prev.map(msg => 
            msg.id === responseData.sessionId
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
        
        // Store cleanup function on the channel
        ;(channel as any).timeoutId = timeoutId
      } else {
        // Sync response (shouldn't happen anymore)
        console.log('[ChatInterface] Unexpected sync response')
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
              {messages.map((message) => {
                // Debug log for Details button visibility
                if (message.role === 'assistant') {
                  console.log('[ChatInterface] Rendering assistant message:', {
                    id: message.id,
                    hasOrchestrationId: !!message.orchestrationSessionId,
                    orchestrationId: message.orchestrationSessionId,
                    role: message.role,
                    contentPreview: message.content?.substring(0, 50)
                  })
                }
                
                return (
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
                    <div>
                      <div
                        className={`rounded-lg px-4 py-3 ${
                          message.role === 'assistant'
                            ? 'bg-white border border-gray-200 text-gray-900'
                            : 'bg-blue-600 text-white'
                        } ${message.error ? 'border-red-300 bg-red-50 text-red-900' : ''}`}
                      >
                        {message.role === 'assistant' ? (
                          (message.content === '🤔 Thinking...' || message.content === '⚡ Processing...' || message.content === '🤔 Processing your request...') ? (
                            <div className="flex items-center gap-2">
                              <span>{message.content.split(' ')[0]}</span>
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                              </div>
                            </div>
                          ) : (
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          )
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500 px-1">
                      <div>
                        {message.timestamp.toLocaleTimeString()}
                        {message.tokens && ` • ${message.tokens} tokens`}
                      </div>
                      {message.orchestrationSessionId && message.role === 'assistant' && (
                        <button
                          onClick={() => {
                            console.log('[ChatInterface] Opening orchestration panel for:', message.orchestrationSessionId)
                            setCurrentOrchestrationId(message.orchestrationSessionId!)
                            setShowOrchestrationPanel(true)
                          }}
                          className="flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors"
                        >
                          <Info className="w-3 h-3" />
                          <span>Details</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {message.role === 'assistant' && (
                    <div className="order-1 w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium">H</span>
                    </div>
                  )}
                </div>
              )})}
              {(() => {
                const showFallbackLoader = isLoading && !messages.some(msg => msg.orchestrationSessionId === currentOrchestrationId)
                if (showFallbackLoader) {
                  console.log('[ChatInterface] Showing fallback loader:', {
                    isLoading,
                    currentOrchestrationId,
                    messagesWithOrchestrationId: messages.filter(m => m.orchestrationSessionId).map(m => ({
                      id: m.id,
                      orchestrationSessionId: m.orchestrationSessionId,
                      content: m.content?.substring(0, 30)
                    }))
                  })
                }
                return showFallbackLoader ? (
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
                ) : null
              })()}
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
      
      {/* Orchestration Panel */}
      <OrchestrationPanel
        sessionId={currentOrchestrationId}
        isVisible={showOrchestrationPanel}
        onClose={() => setShowOrchestrationPanel(false)}
      />
    </div>
  )
}