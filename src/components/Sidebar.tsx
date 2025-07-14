'use client'

import { useEffect } from 'react'
import { ChevronDown, MessageSquare, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getBrowserClient } from '@/lib/supabase-browser'
import { useChatStore } from '@/stores/chat-store'

interface SidebarProps {
  // No props needed - all state comes from Zustand
}

export default function Sidebar({}: SidebarProps) {
  const { user } = useAuth()
  
  // Get all state and actions from chat store
  const {
    threads,
    selectedThreadId,
    loadingThreads,
    sidebarCollapsed,
    editingThreadId,
    editingThreadTitle,
    loadThreads,
    selectThread,
    createNewChat,
    deleteThread,
    startEditingThread,
    setEditingTitle,
    finishEditingThread,
    cancelEditingThread,
    toggleSidebar,
    handleThreadChange
  } = useChatStore()

  useEffect(() => {
    if (user) {
      loadThreads()
    }
    
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
          handleThreadChange(payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE', payload)
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, loadThreads, handleThreadChange])

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this conversation?')) {
      await deleteThread(threadId)
    }
  }

  const handleStartEditing = (threadId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation()
    startEditingThread(threadId, currentTitle || '')
  }

  const handleRenameThread = async (threadId: string) => {
    await finishEditingThread()
  }

  return (
    <div className={`bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 relative ${
      sidebarCollapsed ? 'w-16' : 'w-80'
    }`}>
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-4 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-50 transition-colors z-10 shadow-sm"
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
      
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={createNewChat}
          className="w-full bg-blue-600 text-white rounded-lg py-2.5 px-3 text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <MessageSquare className="w-4 h-4" />
          {!sidebarCollapsed && 'New chat'}
        </button>
      </div>

      {/* Conversations List */}
      {!sidebarCollapsed && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
              Recents
            </div>
            <div className="space-y-1">
              {loadingThreads ? (
                <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
              ) : threads.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No conversations yet</div>
              ) : (
                threads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors ${
                      selectedThreadId === thread.id ? 'bg-blue-100 border-2 border-blue-500 shadow-sm' : 'border-2 border-transparent'
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
                          value={editingThreadTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => handleRenameThread(thread.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              cancelEditingThread()
                            }
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </form>
                    ) : (
                      <>
                        <button
                          onClick={() => selectThread(thread.id)}
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
                            onClick={(e) => handleStartEditing(thread.id, thread.title || '', e)}
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
        <Link
          href="/settings"
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors"
          title={user?.email || 'Settings'}
        >
          <span className="text-gray-600">⚙️</span>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="font-medium">Settings</div>
              {user && <div className="text-xs text-gray-500 truncate">{user.email}</div>}
            </div>
          )}
        </Link>
      </div>
    </div>
  )
}