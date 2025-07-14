'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Sparkles, Info } from 'lucide-react'
import { api } from '@/lib/api-client'
import { getBrowserClient } from '@/lib/supabase-browser'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import OrchestrationExperience from './OrchestrationExperience'
import { useOrchestrationStore } from '@/stores/orchestration-store'

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
  onOpenOrchestration?: (orchestrationId: string, title?: string) => void
}

export default function ChatInterface({ sessionId, onThreadCreated, onOpenOrchestration }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Get orchestration state and actions from Zustand store
  const {
    currentOrchestrationId,
    showOrchestrationPanel,
    setCurrentOrchestrationId,
    setShowOrchestrationPanel,
    addOrchestrationToThread,
    loadOrchestrationsByThread,
    subscribeToSession,
    loadSession,
    getSessionData
  } = useOrchestrationStore()
  
  // Get current orchestration session data
  const currentOrchestrationData = currentOrchestrationId ? getSessionData(currentOrchestrationId) : null

  // Keep track of the previous sessionId to avoid unnecessary reloads
  const prevSessionIdRef = useRef<string | null>(null)
  
  // Load messages when sessionId changes
  useEffect(() => {
    // Only load if sessionId actually changed
    if (sessionId && sessionId !== prevSessionIdRef.current) {
      // Clear messages first when switching threads
      setMessages([])
      
      // Always load messages for existing threads
      loadThreadMessages().then(() => {
        // Check for active orchestration sessions after messages are loaded
        checkActiveOrchestrations()
      })
      
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
        hasResponse: !!response,
        hasThread: !!response?.thread,
        hasMessages: !!response?.messages,
        messageCount: response?.messages?.length,
        rawResponse: response
      })
      
      // Handle the case where response might be null/undefined
      if (!response) {
        console.error('[ChatInterface] No response from API')
        return
      }
      
      const { thread, messages: threadMessages } = response
      
      console.log('[ChatInterface] Loaded thread messages:', {
        sessionId,
        hasThread: !!thread,
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
          mappedMessages.filter((m: Message) => m.orchestrationSessionId).map((m: Message) => ({
            id: m.id,
            role: m.role,
            orchestrationSessionId: m.orchestrationSessionId
          }))
        )
        
        setMessages(mappedMessages)
      } else {
        console.log('[ChatInterface] No messages found for thread')
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to load thread messages:', error)
      setMessages([])
    }
  }
  
  const checkActiveOrchestrations = async () => {
    if (!sessionId) return
    
    console.log('[ChatInterface] Checking for active orchestrations for thread:', sessionId)
    
    try {
      // Use Zustand store to load orchestrations for this thread
      await loadOrchestrationsByThread(sessionId)
      
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
        
        // Add orchestration to thread mapping
        addOrchestrationToThread(sessionId, activeSession.id)
        
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
            
            // Load the session in the store
            loadSession(activeSession.id)
          } else {
            // We have messages already - just ensure the orchestrationSessionId is set
            console.log('[ChatInterface] Updating existing messages with orchestration ID')
            setIsLoading(true) // Also set loading for existing messages
            
            // Load the session in the store
            loadSession(activeSession.id)
          }
        }
        
        // Set up realtime subscription for the active session
        setupOrchestrationSubscription(activeSession.id)
      } else {
        console.log('[ChatInterface] No active orchestration sessions found')
        
        // Check for recently completed sessions that might have finished while disconnected
        const recentlyCompleted = allSessions?.filter(s => 
          s.status === 'completed' && 
          s.final_response &&
          // Completed in the last 15 minutes
          new Date(s.completed_at).getTime() > Date.now() - 15 * 60 * 1000
        ) || []
        
        if (recentlyCompleted.length > 0) {
          const completedSession = recentlyCompleted[0]
          console.log('[ChatInterface] Found recently completed orchestration:', {
            id: completedSession.id,
            completedAt: completedSession.completed_at,
            hasResponse: !!completedSession.final_response
          })
          
          // Add orchestration to thread mapping
          addOrchestrationToThread(sessionId, completedSession.id)
          
          // Check if we already have this response in messages
          const hasResponse = messages.some(msg => 
            msg.orchestrationSessionId === completedSession.id && 
            msg.role === 'assistant' &&
            msg.content !== '🤔 Thinking...' &&
            msg.content !== '⚡ Processing...'
          )
          
          if (!hasResponse && completedSession.final_response) {
            try {
              const finalResponse = JSON.parse(completedSession.final_response)
              const assistantMessage: Message = {
                id: completedSession.id,
                role: 'assistant',
                content: finalResponse.content || finalResponse,
                timestamp: new Date(completedSession.completed_at),
                orchestrationSessionId: completedSession.id
              }
              
              setMessages(prev => {
                // Remove any thinking messages for this session
                const filtered = prev.filter(msg => 
                  !(msg.id === completedSession.id && (msg.content === '🤔 Thinking...' || msg.content === '⚡ Processing...'))
                )
                return [...filtered, assistantMessage]
              })
              
              console.log('[ChatInterface] Added completed orchestration response to messages')
            } catch (e) {
              console.error('[ChatInterface] Failed to parse completed session response:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to check active orchestrations:', error)
    }
  }
  
  const setupOrchestrationSubscription = (sessionId: string) => {
    console.log(`[ChatInterface] Setting up realtime subscription for session ${sessionId}`)
    // Use the Zustand store's subscription management
    subscribeToSession(sessionId)
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
  
  // Monitor orchestration session status changes
  useEffect(() => {
    if (!currentOrchestrationData || !currentOrchestrationId) return
    
    const sessionInfo = currentOrchestrationData.info
    if (!sessionInfo) return
    
    console.log('[ChatInterface] Orchestration status changed:', {
      id: currentOrchestrationId,
      status: sessionInfo.status,
      hasError: !!sessionInfo.error
    })
    
    if (sessionInfo.status === 'completed') {
      // Clear timeout if exists
      const timeoutId = (window as any)[`orchestration-timeout-${currentOrchestrationId}`]
      if (timeoutId) {
        clearTimeout(timeoutId)
        delete (window as any)[`orchestration-timeout-${currentOrchestrationId}`]
      }
      
      // Fetch the complete session data to get final response
      const fetchCompleteSession = async () => {
        const supabase = getBrowserClient()
        console.log(`[ChatInterface] Session completed, fetching full data for ${currentOrchestrationId}`)
        try {
          const { data: completeSession, error } = await supabase
            .from('orchestration_sessions')
            .select('*')
            .eq('id', currentOrchestrationId)
            .single()
          
          if (error || !completeSession) {
            throw new Error(`Failed to fetch complete session: ${error?.message}`)
          }
          
          if (completeSession.final_response) {
            const finalResponse = JSON.parse(completeSession.final_response)
            console.log('[ChatInterface] Updating message with final response')
            
            // Update the thinking message with the actual response
            setMessages(prev => prev.map(msg => 
              msg.id === currentOrchestrationId
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
      }
      
      fetchCompleteSession()
    } else if (sessionInfo.status === 'failed') {
      // Clear timeout if exists
      const timeoutId = (window as any)[`orchestration-timeout-${currentOrchestrationId}`]
      if (timeoutId) {
        clearTimeout(timeoutId)
        delete (window as any)[`orchestration-timeout-${currentOrchestrationId}`]
      }
      
      // Update message to show error
      setMessages(prev => prev.map(msg => 
        msg.id === currentOrchestrationId
          ? { 
              ...msg, 
              content: sessionInfo.error || 'An error occurred processing your request.',
              error: true,
              timestamp: new Date()
            }
          : msg
      ))
      setIsLoading(false)
    } else if (sessionInfo.status === 'running' || sessionInfo.status === 'pending') {
      // Update status to show it's being processed
      setMessages(prev => prev.map(msg => 
        msg.id === currentOrchestrationId
          ? { ...msg, content: '⚡ Processing...' }
          : msg
      ))
    }
  }, [currentOrchestrationData?.info?.status, currentOrchestrationId, sessionId, onThreadCreated])

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
      
      // Check if this is an async response (status: 'pending' or 'running' indicates async)
      // The Edge Function returns { success: true, data: { sessionId, status, ... } }
      const responseData = response.data || response
      if ((responseData.async || responseData.status === 'pending' || responseData.status === 'running') && responseData.sessionId) {
        console.log('[ChatInterface] Async response detected, setting up realtime')
        
        // Set current orchestration session
        setCurrentOrchestrationId(responseData.sessionId)
        
        // Add orchestration to thread mapping
        if (sessionId) {
          addOrchestrationToThread(sessionId, responseData.sessionId)
        }
        
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
        
        // Load the session in the store and subscribe to updates
        loadSession(responseData.sessionId)
        
        // Store timeout for cleanup - 13 minutes (just under Lambda's 14 minute timeout)
        const timeoutId = setTimeout(() => {
          console.log(`[ChatInterface] Client timeout reached for session ${responseData.sessionId}`)
          setMessages(prev => prev.map(msg => 
            msg.id === responseData.sessionId
              ? { 
                  ...msg, 
                  content: 'The request is taking longer than expected. It may still be processing in the background. Please check back in a few minutes or try a simpler request.',
                  error: true,
                  timestamp: new Date()
                }
              : msg
          ))
          setIsLoading(false)
          setCurrentOrchestrationId(null)
        }, 13 * 60 * 1000) // 13 minutes timeout
        
        // Store timeout reference for cleanup
        ;(window as any)[`orchestration-timeout-${responseData.sessionId}`] = timeoutId
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
                            console.log('[ChatInterface] Opening orchestration tab for:', message.orchestrationSessionId)
                            if (onOpenOrchestration) {
                              // Extract a title from the message if possible
                              const title = message.content.split('\n')[0].substring(0, 50)
                              onOpenOrchestration(message.orchestrationSessionId!, title)
                            } else {
                              // Fallback to old behavior if no callback provided
                              setCurrentOrchestrationId(message.orchestrationSessionId!)
                              setShowOrchestrationPanel(true)
                            }
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
      
      {/* Orchestration Panel - Only show if no tab callback provided */}
      {!onOpenOrchestration && (
        <OrchestrationExperience
          sessionId={currentOrchestrationId}
          isVisible={showOrchestrationPanel}
          onClose={() => setShowOrchestrationPanel(false)}
          fullScreen={false}
        />
      )}
    </div>
  )
}