'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api-client'
import TwoPanelLayout from '@/components/TwoPanelLayout'
import ThreadConversation from '@/components/ThreadConversation'
import ArtifactRenderer from '@/components/ArtifactRenderer'
import Sidebar from '@/components/Sidebar'

export default function ChatV2Page() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [toolOutputs, setToolOutputs] = useState<any[]>([])
  const [thoughts, setThoughts] = useState<string[]>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    // Create initial thread on mount
    if (user && !currentThreadId) {
      createNewThread()
    }
  }, [user])

  const createNewThread = async () => {
    try {
      const { thread } = await api.threads.create('New Chat')
      setCurrentThreadId(thread.id)
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

  const handleSelectChat = async (threadId: string) => {
    try {
      setCurrentThreadId(threadId)
      setCurrentSessionId(null)
      setToolOutputs([])
      setThoughts([])
    } catch (error) {
      console.error('Failed to load thread:', error)
    }
  }

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
      <Sidebar 
        currentSessionId={currentThreadId} 
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
      />
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