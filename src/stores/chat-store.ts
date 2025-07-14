import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { api } from '@/lib/api-client'

// Types
export interface ChatThread {
  id: string
  title: string | null
  created_at: string
  updated_at: string
  message_count: number
  last_message_at: string | null
}

export interface Tab {
  id: string
  type: 'chat' | 'orchestration' | 'tool-detail'
  title: string
  sessionId?: string | null // For chat tabs
  orchestrationId?: string | null // For orchestration tabs
  toolData?: { // For tool detail tabs
    toolCall: any
    toolResult: any
  }
}

interface ChatState {
  // Thread management
  threads: ChatThread[]
  selectedThreadId: string | null
  loadingThreads: boolean
  refreshThreadsTrigger: number
  
  // Tab management
  tabs: Tab[]
  activeTabId: string
  tabHistory: string[]
  
  // Sidebar state
  sidebarCollapsed: boolean
  editingThreadId: string | null
  editingThreadTitle: string
}

interface ChatActions {
  // Thread management
  loadThreads: () => Promise<void>
  selectThread: (threadId: string | null) => void
  createNewChat: () => void
  deleteThread: (threadId: string) => Promise<void>
  updateThread: (threadId: string, updates: { title?: string }) => Promise<void>
  refreshThreadList: () => void
  
  // Thread editing
  startEditingThread: (threadId: string, currentTitle: string) => void
  setEditingTitle: (title: string) => void
  finishEditingThread: () => Promise<void>
  cancelEditingThread: () => void
  
  // Tab management
  addTab: (tab: Tab) => void
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateTabSession: (tabId: string, sessionId: string) => void
  openOrchestrationTab: (orchestrationId: string, title?: string) => void
  openToolDetailTab: (toolCall: any, toolResult: any) => void
  
  // Sidebar
  toggleSidebar: () => void
  
  // Realtime updates
  handleThreadChange: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => void
}

type ChatStore = ChatState & ChatActions

// Initial tab
const createInitialTab = (sessionId?: string | null): Tab => ({
  id: 'chat-1',
  type: 'chat',
  title: 'Chat',
  sessionId: sessionId || null
})

export const useChatStore = create<ChatStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      threads: [],
      selectedThreadId: null,
      loadingThreads: true,
      refreshThreadsTrigger: 0,
      tabs: [createInitialTab()],
      activeTabId: 'chat-1',
      tabHistory: ['chat-1'],
      sidebarCollapsed: false,
      editingThreadId: null,
      editingThreadTitle: '',
      
      // Actions
      loadThreads: async () => {
        set({ loadingThreads: true })
        try {
          const response = await api.threads.list()
          const threadData = response.threads || response || []
          const threads = Array.isArray(threadData) ? threadData : []
          set({ threads, loadingThreads: false })
        } catch (error) {
          console.error('Failed to load threads:', error)
          set({ threads: [], loadingThreads: false })
        }
      },
      
      selectThread: (threadId) => {
        const { tabs, activeTabId } = get()
        
        // Update the selected thread
        set({ selectedThreadId: threadId })
        
        // Find the active chat tab and update its sessionId
        const activeChatTab = tabs.find(tab => tab.type === 'chat' && tab.id === activeTabId)
        if (activeChatTab) {
          set(state => ({
            tabs: state.tabs.map(tab => 
              tab.id === activeChatTab.id 
                ? { ...tab, sessionId: threadId }
                : tab
            )
          }))
        } else if (threadId) {
          // If no chat tab is active, find any chat tab and activate it
          const anyChatTab = tabs.find(tab => tab.type === 'chat')
          if (anyChatTab) {
            set(state => ({
              tabs: state.tabs.map(tab => 
                tab.id === anyChatTab.id 
                  ? { ...tab, sessionId: threadId }
                  : tab
              ),
              activeTabId: anyChatTab.id
            }))
          }
        }
        
        // Update URL
        if (threadId) {
          window.history.pushState({}, '', `/chat/${threadId}`)
        } else {
          window.history.pushState({}, '', '/chat')
        }
      },
      
      createNewChat: () => {
        get().selectThread(null)
      },
      
      deleteThread: async (threadId) => {
        try {
          await api.threads.delete(threadId)
          set(state => ({
            threads: state.threads.filter(t => t.id !== threadId)
          }))
          
          // If this was the selected thread, create new chat
          if (get().selectedThreadId === threadId) {
            get().createNewChat()
          }
        } catch (error) {
          console.error('Failed to delete thread:', error)
        }
      },
      
      updateThread: async (threadId, updates) => {
        try {
          await api.threads.update(threadId, updates)
          set(state => ({
            threads: state.threads.map(t => 
              t.id === threadId ? { ...t, ...updates } : t
            )
          }))
        } catch (error) {
          console.error('Failed to update thread:', error)
          throw error
        }
      },
      
      refreshThreadList: () => {
        set(state => ({ refreshThreadsTrigger: state.refreshThreadsTrigger + 1 }))
        get().loadThreads()
      },
      
      // Thread editing
      startEditingThread: (threadId, currentTitle) => {
        set({
          editingThreadId: threadId,
          editingThreadTitle: currentTitle || 'Untitled conversation'
        })
      },
      
      setEditingTitle: (title) => {
        set({ editingThreadTitle: title })
      },
      
      finishEditingThread: async () => {
        const { editingThreadId, editingThreadTitle } = get()
        if (!editingThreadId || !editingThreadTitle.trim()) {
          set({ editingThreadId: null })
          return
        }
        
        try {
          await get().updateThread(editingThreadId, { title: editingThreadTitle.trim() })
          set({ editingThreadId: null })
        } catch (error) {
          // Keep editing state on error
        }
      },
      
      cancelEditingThread: () => {
        set({ editingThreadId: null, editingThreadTitle: '' })
      },
      
      // Tab management
      addTab: (tab) => {
        set(state => ({
          tabs: [...state.tabs, tab],
          activeTabId: tab.id,
          tabHistory: [...state.tabHistory.filter(id => id !== tab.id), tab.id]
        }))
      },
      
      removeTab: (tabId) => {
        const { tabs, activeTabId, tabHistory } = get()
        const newTabs = tabs.filter(tab => tab.id !== tabId)
        
        // If we're closing the active tab, switch to the last visited tab
        let newActiveTabId = activeTabId
        if (activeTabId === tabId && newTabs.length > 0) {
          const remainingHistory = tabHistory.filter(id => 
            id !== tabId && newTabs.some(tab => tab.id === id)
          )
          newActiveTabId = remainingHistory[remainingHistory.length - 1] || newTabs[0].id
        }
        
        // Ensure at least one tab remains
        if (newTabs.length === 0) {
          const defaultTab = createInitialTab()
          set({
            tabs: [defaultTab],
            activeTabId: defaultTab.id,
            tabHistory: [defaultTab.id]
          })
        } else {
          set({
            tabs: newTabs,
            activeTabId: newActiveTabId,
            tabHistory: tabHistory.filter(id => id !== tabId)
          })
        }
      },
      
      setActiveTab: (tabId) => {
        const { activeTabId, tabHistory } = get()
        if (tabId !== activeTabId) {
          set({
            activeTabId: tabId,
            tabHistory: [...tabHistory.filter(id => id !== tabId), tabId]
          })
        }
      },
      
      updateTabSession: (tabId, sessionId) => {
        set(state => ({
          tabs: state.tabs.map(tab => 
            tab.id === tabId ? { ...tab, sessionId } : tab
          )
        }))
      },
      
      openOrchestrationTab: (orchestrationId, title) => {
        const { tabs } = get()
        
        // Check if tab already exists
        const existingTab = tabs.find(tab => 
          tab.type === 'orchestration' && tab.orchestrationId === orchestrationId
        )
        
        if (existingTab) {
          get().setActiveTab(existingTab.id)
          return
        }
        
        // Create new orchestration tab
        const newTab: Tab = {
          id: `orch-${orchestrationId}`,
          type: 'orchestration',
          title: title || `Details: ${orchestrationId.slice(0, 8)}...`,
          orchestrationId
        }
        
        get().addTab(newTab)
      },
      
      openToolDetailTab: (toolCall, toolResult) => {
        const { tabs } = get()
        const toolDetailId = `${toolCall.tool_call_id}-detail`
        
        // Check if tab already exists
        const existingTab = tabs.find(tab => 
          tab.type === 'tool-detail' && tab.id === toolDetailId
        )
        
        if (existingTab) {
          get().setActiveTab(existingTab.id)
          return
        }
        
        // Create a title from the tool name
        const toolName = toolCall.tool.startsWith('mcp_') 
          ? toolCall.tool.replace('mcp_', '').split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          : toolCall.tool.replace(/([A-Z])/g, ' $1').trim()
        
        // Create new tool detail tab
        const newTab: Tab = {
          id: toolDetailId,
          type: 'tool-detail',
          title: `Tool: ${toolName}`,
          toolData: {
            toolCall,
            toolResult
          }
        }
        
        get().addTab(newTab)
      },
      
      toggleSidebar: () => {
        set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }))
      },
      
      handleThreadChange: (eventType, payload) => {
        switch (eventType) {
          case 'INSERT':
            const newThread = payload.new as ChatThread
            set(state => ({ threads: [newThread, ...state.threads] }))
            break
            
          case 'UPDATE':
            const updatedThread = payload.new as ChatThread
            set(state => ({
              threads: state.threads.map(t => 
                t.id === updatedThread.id ? updatedThread : t
              )
            }))
            break
            
          case 'DELETE':
            const deletedThread = payload.old as { id: string }
            set(state => ({
              threads: state.threads.filter(t => t.id !== deletedThread.id)
            }))
            
            // If this was the selected thread, create new chat
            if (get().selectedThreadId === deletedThread.id) {
              get().createNewChat()
            }
            break
        }
      }
    }))
  )
)