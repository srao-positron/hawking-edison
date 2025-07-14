'use client'

import { useEffect, useCallback } from 'react'
import { X, MessageSquare, Activity, Wrench } from 'lucide-react'
import ChatInterface from './ChatInterface'
import OrchestrationExperience from './OrchestrationExperience'
import ToolDetail from './ToolDetail'
import { useChatStore } from '@/stores/chat-store'

interface TabManagerProps {
  onThreadCreated: (threadId: string) => void
}

export default function TabManager({ onThreadCreated }: TabManagerProps) {
  // Get all state and actions from chat store
  const {
    tabs,
    activeTabId,
    selectedThreadId,
    addTab,
    removeTab,
    setActiveTab,
    updateTabSession,
    openOrchestrationTab,
    openToolDetailTab
  } = useChatStore()
  
  // Update the active chat tab when selectedThreadId changes
  useEffect(() => {
    // Only update chat tabs when the thread selection changes
    // Don't interfere with other tab types
    const chatTabs = tabs.filter(tab => tab.type === 'chat')
    const activeChatTab = chatTabs.find(tab => tab.id === activeTabId)
    
    // If a chat tab is currently active and the thread changed, update it
    if (activeChatTab && activeChatTab.sessionId !== selectedThreadId) {
      updateTabSession(activeChatTab.id, selectedThreadId || '')
    }
    // If no chat tab exists and we have a thread, we might need to handle this
    // But we should NOT switch away from other tab types
  }, [selectedThreadId]) // Only react to thread changes, not tab changes

  // Wrapped callback to handle thread creation
  const handleThreadCreated = useCallback((threadId: string) => {
    // Find the current chat tab
    const currentChatTab = tabs.find(tab => tab.type === 'chat' && tab.id === activeTabId)
    if (currentChatTab) {
      updateTabSession(currentChatTab.id, threadId)
    }
    onThreadCreated(threadId)
  }, [tabs, activeTabId, updateTabSession, onThreadCreated])

  const activeTab = tabs.find(tab => tab.id === activeTabId)

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="flex items-center border-b bg-gray-50 px-2 min-h-[40px] overflow-x-auto">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`
              flex items-center gap-2 px-3 py-2 border-r cursor-pointer
              hover:bg-white transition-colors min-w-0 flex-shrink-0
              ${activeTabId === tab.id ? 'bg-white border-b-white' : 'bg-gray-100'}
            `}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.type === 'chat' ? (
              <MessageSquare className="w-4 h-4 text-gray-600 flex-shrink-0" />
            ) : tab.type === 'orchestration' ? (
              <Activity className="w-4 h-4 text-blue-600 flex-shrink-0" />
            ) : (
              <Wrench className="w-4 h-4 text-green-600 flex-shrink-0" />
            )}
            <span className="text-sm truncate max-w-[150px]" title={tab.title}>
              {tab.title}
            </span>
            {(tab.type === 'orchestration' || tab.type === 'tool-detail') && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeTab(tab.id)
                }}
                className="ml-2 p-0.5 hover:bg-gray-200 rounded"
                title="Close tab"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Tab Content - Render all tabs but only show active one */}
      <div className="flex-1 overflow-hidden relative">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`absolute inset-0 ${tab.id === activeTabId ? 'block' : 'hidden'}`}
          >
            {tab.type === 'chat' ? (
              <ChatInterface
                sessionId={tab.sessionId}
                onThreadCreated={handleThreadCreated}
                onOpenOrchestration={openOrchestrationTab}
              />
            ) : tab.type === 'orchestration' ? (
              <div className="h-full">
                <OrchestrationExperience
                  sessionId={tab.orchestrationId || null}
                  isVisible={tab.id === activeTabId}
                  onClose={() => removeTab(tab.id)}
                  fullScreen={true}
                  onOpenToolDetails={openToolDetailTab}
                />
              </div>
            ) : tab.type === 'tool-detail' && tab.toolData ? (
              <ToolDetail
                toolCall={tab.toolData.toolCall}
                toolResult={tab.toolData.toolResult}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}