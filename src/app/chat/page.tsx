'use client'

import { useState, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

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

  const handleSelectChat = (sessionId: string) => {
    // TODO: Load conversation history for selected chat
    setCurrentSessionId(sessionId)
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