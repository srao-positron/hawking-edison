'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, MessageSquare, Trash2 } from 'lucide-react'
import { api } from '@/lib/api-client'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

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
  const { user } = useAuth()

  useEffect(() => {
    loadThreads(true)
    
    // Poll for updates every 5 seconds when component is mounted
    const interval = setInterval(() => {
      loadThreads(false)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const loadThreads = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setLoading(true)
      const response = await api.threads.list()
      // Handle both { threads: [...] } and direct array responses
      const threadData = response.threads || response || []
      const newThreads = Array.isArray(threadData) ? threadData : []
      
      // Only update if threads have changed (compare IDs)
      const currentIds = threads.map(t => t.id).join(',')
      const newIds = newThreads.map(t => t.id).join(',')
      
      if (currentIds !== newIds || threads.length === 0) {
        setThreads(newThreads)
      }
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

  return (
    <div className={`bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewChat}
          className="w-full bg-blue-600 text-white border border-blue-600 rounded-lg py-2.5 px-3 text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
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
                      currentSessionId === thread.id ? 'bg-blue-50 border border-blue-200' : ''
                    }`}
                  >
                    <button
                      onClick={() => onSelectChat?.(thread.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="font-medium truncate">
                        {thread.title || 'Untitled conversation'}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(thread.updated_at).toLocaleDateString()}
                        {thread.message_count > 0 && ` • ${thread.message_count} messages`}
                      </div>
                    </button>
                    <button
                      onClick={(e) => handleDeleteThread(thread.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all flex-shrink-0 self-center"
                    >
                      <Trash2 className="w-3 h-3 text-gray-500" />
                    </button>
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
            href="/settings/api-keys"
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