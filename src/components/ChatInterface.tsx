'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Settings, History, Plus } from 'lucide-react'
import { api } from '@/lib/api-client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  tokens?: number
  error?: boolean
}

interface ChatInterfaceProps {
  sessionId?: string
  onNewSession?: () => void
}

export default function ChatInterface({ sessionId, onNewSession }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset messages when sessionId changes
  useEffect(() => {
    setMessages([])
    setIsLoading(false)
  }, [sessionId])

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
      const response = await api.interact(input.trim(), { sessionId })
      
      const assistantMessage: Message = {
        id: response.interactionId,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        tokens: response.usage?.totalTokens
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        error: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onNewSession}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="New conversation"
            >
              <Plus className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">Hawking Edison</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="History"
            >
              <History className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-8 px-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-32">
              <h2 className="text-2xl font-semibold mb-2">Welcome to Hawking Edison</h2>
              <p>Start a conversation to begin</p>
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
                      } ${message.error ? 'border-red-300 bg-red-50' : ''}`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 px-1">
                      {message.timestamp.toLocaleTimeString()}
                      {message.tokens && ` • ${message.tokens} tokens`}
                    </div>
                  </div>
                  {message.role === 'assistant' && (
                    <div className="order-1 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold">H</span>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold">H</span>
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
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4">
          <div className="relative flex items-end gap-2">
            <button
              type="button"
              className="p-2 hover:bg-gray-100 rounded-md transition-colors mb-1"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Hawking Edison..."
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                style={{ maxHeight: '200px' }}
              />
              
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`absolute right-2 bottom-2 p-2 rounded-md transition-colors ${
                  input.trim() && !isLoading
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 text-center">
            Hawking Edison can make mistakes. Check important info.
          </div>
        </form>
      </div>
    </div>
  )
}