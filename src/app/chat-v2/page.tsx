'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api-client'
import TwoPanelLayout from '@/components/TwoPanelLayout'
import ThreadConversation from '@/components/ThreadConversation'
import ArtifactRenderer from '@/components/ArtifactRenderer'
import Sidebar from '@/components/Sidebar'
import { useChatStore } from '@/stores/chat-store'

export default function ChatV2Page() {
  const { user, loading } = useAuth()
  const router = useRouter()
  // Get state from chat store
  const { selectedThreadId: currentThreadId, loadThreads } = useChatStore()
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [toolOutputs, setToolOutputs] = useState<any[]>([])
  const [thoughts, setThoughts] = useState<string[]>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    // Load threads on mount
    if (user) {
      loadThreads()
    }
  }, [user, loadThreads])

  useEffect(() => {
    // Create initial thread on mount if none selected
    if (user && !currentThreadId) {
      createNewThread()
    }
  }, [user, currentThreadId])

  const createNewThread = async () => {
    try {
      const { thread } = await api.threads.create('New Chat')
      // The thread will be selected via realtime update
      setCurrentSessionId(null)
      setToolOutputs([])
      setThoughts([])
    } catch (error) {
      console.error('Failed to create thread:', error)
    }
  }

  const handleNewChat = () => {
    createNewThread()
  }

  // Thread selection is now handled by the Sidebar directly

  const handleToolExecution = (tool: string, params: any, result: any) => {
    if (result) {
      setToolOutputs(prev => [...prev, { tool, params, result, timestamp: new Date() }])
    }
  }

  const handleThinking = (thought: string) => {
    setThoughts(prev => [...prev, thought])
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

  if (!user || !currentThreadId) {
    return null
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1">
        <TwoPanelLayout
          rightPanel={
            <ArtifactRenderer 
              threadId={currentThreadId} 
              sessionId={currentSessionId || undefined}
            />
          }
          rightPanelTitle="Tool Outputs & Visualizations"
          defaultRightPanelOpen={false}
          rightPanelWidth="w-[480px]"
        >
          <ThreadConversation 
            threadId={currentThreadId}
            onToolExecution={handleToolExecution}
            onThinking={handleThinking}
          />
        </TwoPanelLayout>
      </div>
    </div>
  )
}