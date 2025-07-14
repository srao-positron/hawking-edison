'use client'

import { useEffect, Suspense } from 'react'
import Sidebar from '@/components/Sidebar'
import TabManager from '@/components/TabManager'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, useSearchParams, useParams, usePathname } from 'next/navigation'
import { useChatStore } from '@/stores/chat-store'

function ChatPageContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const pathname = usePathname()
  
  // Get all state from chat store
  const { 
    selectedThreadId, 
    selectThread,
    createNewChat,
    refreshThreadList,
    loadThreads
  } = useChatStore()

  // Initialize session from URL (path param takes precedence)
  useEffect(() => {
    const threadIdFromPath = params.threadId as string
    const threadIdFromQuery = searchParams.get('thread')
    const threadId = threadIdFromPath || threadIdFromQuery
    
    console.log('[ChatPage] URL sync:', {
      threadIdFromPath,
      threadIdFromQuery,
      threadId,
      selectedThreadId,
      pathname
    })
    
    // If we're at /chat (not /chat/[threadId]), clear the selection
    if (pathname === '/chat' && selectedThreadId) {
      console.log('[ChatPage] At /chat root, clearing selection')
      selectThread(null)
    } else if (threadId && threadId !== selectedThreadId) {
      console.log('[ChatPage] Selecting thread from URL:', threadId)
      selectThread(threadId)
    } else if (!threadId && pathname === '/chat' && selectedThreadId) {
      // Extra check: if no threadId in URL but we have a selection, clear it
      console.log('[ChatPage] No thread in URL but have selection, clearing')
      selectThread(null)
    }
  }, [params.threadId, searchParams, selectedThreadId, selectThread, pathname])

  // Load threads on mount
  useEffect(() => {
    if (user) {
      loadThreads()
    }
  }, [user, loadThreads])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  const handleThreadCreated = (threadId: string) => {
    selectThread(threadId)
    refreshThreadList()
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
      <Sidebar />
      <div className="flex-1">
        <TabManager onThreadCreated={handleThreadCreated} />
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