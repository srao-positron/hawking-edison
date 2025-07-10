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
  currentSessionId?: string
  onNewChat: () => void
  onSelectChat?: (sessionId: string) => void
}

export default function Sidebar({ currentSessionId, onNewChat, onSelectChat }: SidebarProps) {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    loadThreads()
  }, [])

  const loadThreads = async () => {
    try {
      setLoading(true)
      const response = await api.threads.list()
      // Handle both { threads: [...] } and direct array responses
      const threadData = response.threads || response || []
      setThreads(Array.isArray(threadData) ? threadData : [])
    } catch (error) {
      console.error('Failed to load threads:', error)
      setThreads([]) // Ensure threads is always an array
    } finally {
      setLoading(false)
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
          className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
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
                    className={`group relative w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors ${
                      currentSessionId === thread.id ? 'bg-gray-100' : ''
                    }`}
                  >
                    <button
                      onClick={() => onSelectChat?.(thread.id)}
                      className="w-full text-left"
                    >
                      <div className="font-medium truncate pr-8">
                        {thread.title || 'Untitled conversation'}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(thread.updated_at).toLocaleDateString()}
                        {thread.message_count > 0 && ` • ${thread.message_count} messages`}
                      </div>
                    </button>
                    <button
                      onClick={(e) => handleDeleteThread(thread.id, e)}
                      className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
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