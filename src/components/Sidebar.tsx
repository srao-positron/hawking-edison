'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, MessageSquare, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api-client'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getBrowserClient } from '@/lib/supabase-browser'

interface ChatThread {
  id: string
  title: string | null
  created_at: string
  updated_at: string
  message_count: number
  last_message_at: string | null
}

interface SidebarProps {
  currentSessionId?: string | null
  onNewChat: () => void
  onSelectChat?: (sessionId: string) => void
  refreshTrigger?: number
}

export default function Sidebar({ currentSessionId, onNewChat, onSelectChat, refreshTrigger }: SidebarProps) {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    loadThreads(true)
    
    // Set up Supabase Realtime subscription for chat_threads changes
    const supabase = getBrowserClient()
    const channel = supabase
      .channel('chat-threads-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'chat_threads',
          filter: user ? `user_id=eq.${user.id}` : undefined
        },
        (payload) => {
          console.log('Thread change detected:', payload)
          
          if (payload.eventType === 'INSERT') {
            // Add new thread to the list
            const newThread = payload.new as ChatThread
            setThreads(prev => [newThread, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            // Update existing thread
            const updatedThread = payload.new as ChatThread
            setThreads(prev => prev.map(t => 
              t.id === updatedThread.id ? updatedThread : t
            ))
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted thread
            const deletedThread = payload.old as { id: string }
            setThreads(prev => prev.filter(t => t.id !== deletedThread.id))
          }
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Refresh when refreshTrigger changes (e.g., new thread created)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadThreads(false)
    }
  }, [refreshTrigger])

  const loadThreads = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setLoading(true)
      const response = await api.threads.list()
      // Handle both { threads: [...] } and direct array responses
      const threadData = response.threads || response || []
      const newThreads = Array.isArray(threadData) ? threadData : []
      setThreads(newThreads)
    } catch (error) {
      console.error('Failed to load threads:', error)
      if (isInitialLoad) setThreads([])
    } finally {
      if (isInitialLoad) setLoading(false)
    }
  }

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this conversation?')) {
      try {
        await api.threads.delete(threadId)
        setThreads(threads.filter(t => t.id !== threadId))
        if (currentSessionId === threadId) {
          onNewChat()
        }
      } catch (error) {
        console.error('Failed to delete thread:', error)
      }
    }
  }

  const startEditingThread = (threadId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingThreadId(threadId)
    setEditingTitle(currentTitle || 'Untitled conversation')
  }

  const handleRenameThread = async (threadId: string) => {
    if (!editingTitle.trim()) {
      setEditingThreadId(null)
      return
    }

    try {
      await api.threads.update(threadId, { title: editingTitle.trim() })
      setThreads(threads.map(t => 
        t.id === threadId ? { ...t, title: editingTitle.trim() } : t
      ))
      setEditingThreadId(null)
    } catch (error) {
      console.error('Failed to rename thread:', error)
    }
  }

  return (
    <div className={`bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 relative ${
      collapsed ? 'w-16' : 'w-80'
    }`}>
      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-4 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-50 transition-colors z-10 shadow-sm"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
      
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewChat}
          className="w-full bg-blue-600 text-white rounded-lg py-2.5 px-3 text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <MessageSquare className="w-4 h-4" />
          {!collapsed && 'New chat'}
        </button>
      </div>

      {/* Conversations List */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
              Recents
            </div>
            <div className="space-y-1">
              {loading ? (
                <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
              ) : threads.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No conversations yet</div>
              ) : (
                threads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors ${
                      currentSessionId === thread.id ? 'bg-blue-100 border-2 border-blue-500 shadow-sm' : 'border-2 border-transparent'
                    }`}
                  >
                    {editingThreadId === thread.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleRenameThread(thread.id)
                        }}
                        className="flex-1 flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => handleRenameThread(thread.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setEditingThreadId(null)
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </form>
                    ) : (
                      <>
                        <button
                          onClick={() => onSelectChat?.(thread.id)}
                          className="flex-1 text-left min-w-0 flex items-center"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate pr-1">
                              {thread.title || 'Untitled conversation'}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <span>{new Date(thread.updated_at).toLocaleDateString()}</span>
                              {thread.message_count > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="whitespace-nowrap">{thread.message_count} {thread.message_count === 1 ? 'message' : 'messages'}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => startEditingThread(thread.id, thread.title || '', e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded transition-all flex-shrink-0"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteThread(thread.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 rounded transition-all flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 mt-auto">
        <div className="space-y-2">
          {!collapsed && user && (
            <div className="text-xs text-gray-500 px-3 py-2">
              {user.email}
            </div>
          )}
          <Link
            href="/settings"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-gray-600">⚙️</span>
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
      </div>
    </div>
  )
}