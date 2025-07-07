'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, MessageSquare } from 'lucide-react'
import { api } from '@/lib/api-client'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

interface Conversation {
  id: string
  title: string
  createdAt: Date
  lastMessageAt: Date
}

interface SidebarProps {
  currentSessionId?: string
  onNewChat: () => void
  onSelectChat?: (sessionId: string) => void
}

export default function Sidebar({ currentSessionId, onNewChat, onSelectChat }: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    // TODO: Load conversations from API
    // For now, using mock data
    setConversations([
      {
        id: '1',
        title: 'Meta-Intelligence AI Research Guide',
        createdAt: new Date('2024-01-07'),
        lastMessageAt: new Date('2024-01-07')
      },
      {
        id: '2',
        title: 'Local LLMs and Claude Cust Wor...',
        createdAt: new Date('2024-01-06'),
        lastMessageAt: new Date('2024-01-06')
      },
      {
        id: '3',
        title: 'Reading Markdown File',
        createdAt: new Date('2024-01-05'),
        lastMessageAt: new Date('2024-01-05')
      },
      {
        id: '4',
        title: 'AI Simulation Research',
        createdAt: new Date('2024-01-04'),
        lastMessageAt: new Date('2024-01-04')
      }
    ])
  }, [])

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
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectChat?.(conv.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors ${
                    currentSessionId === conv.id ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="font-medium truncate">{conv.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {conv.lastMessageAt.toLocaleDateString()}
                  </div>
                </button>
              ))}
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