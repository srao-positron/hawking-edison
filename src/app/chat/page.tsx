'use client'

import { useState } from 'react'
import ChatInterface from '@/components/ChatInterface'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ChatPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentSessionId, setCurrentSessionId] = useState<string>(crypto.randomUUID())

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  const handleNewSession = () => {
    // Generate new session ID and reset messages
    setCurrentSessionId(crypto.randomUUID())
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

  return <ChatInterface sessionId={currentSessionId} onNewSession={handleNewSession} />
}