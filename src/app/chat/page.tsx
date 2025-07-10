'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import ChatInterface from '@/components/ChatInterface'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { api } from '@/lib/api-client'

function ChatPageContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [refreshThreads, setRefreshThreads] = useState(0)

  // Initialize session from URL (path param takes precedence)
  useEffect(() => {
    const threadIdFromPath = params.threadId as string
    const threadIdFromQuery = searchParams.get('thread')
    const threadId = threadIdFromPath || threadIdFromQuery
    
    if (threadId) {
      setCurrentSessionId(threadId)
    }
  }, [params.threadId, searchParams])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  const handleNewChat = () => {
    // Clear current session to start fresh
    setCurrentSessionId(null)
    router.push('/chat')
  }

  const handleSelectChat = async (threadId: string) => {
    try {
      // Update URL and session
      router.push(`/chat/${threadId}`)
      setCurrentSessionId(threadId)
    } catch (error) {
      console.error('Failed to load thread:', error)
      // If thread not found, start new
      handleNewChat()
    }
  }

  const handleThreadCreated = useCallback((threadId: string) => {
    // Update URL when a new thread is created
    router.push(`/chat/${threadId}`)
    setCurrentSessionId(threadId)
    // Trigger a single refresh of the thread list
    setRefreshThreads(prev => prev + 1)
  }, [router])

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
        refreshTrigger={refreshThreads}
      />
      <div className="flex-1">
        <ChatInterface 
          sessionId={currentSessionId} 
          onThreadCreated={handleThreadCreated}
        />
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  )
}