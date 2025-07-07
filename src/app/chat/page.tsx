'use client'

import { useState, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'

export default function ChatPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentSessionId, setCurrentSessionId] = useState<string>(crypto.randomUUID())

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  const handleNewChat = () => {
    // Generate new session ID and reset messages
    setCurrentSessionId(crypto.randomUUID())
  }

  const handleSelectChat = async (threadId: string) => {
    try {
      // Load conversation history for selected thread
      const { thread, messages } = await api.threads.get(threadId)
      setCurrentSessionId(threadId)
    } catch (error) {
      console.error('Failed to load thread:', error)
      // If thread not found, start new
      handleNewChat()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen">
      <Sidebar 
        currentSessionId={currentSessionId} 
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
      />
      <div className="flex-1">
        <ChatInterface sessionId={currentSessionId} />
      </div>
    </div>
  )
}