'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2 } from 'lucide-react'

interface TwoPanelLayoutProps {
  children: React.ReactNode
  rightPanel: React.ReactNode
  rightPanelTitle?: string
  defaultRightPanelOpen?: boolean
  rightPanelWidth?: string
}

export default function TwoPanelLayout({
  children,
  rightPanel,
  rightPanelTitle = 'Tool Outputs',
  defaultRightPanelOpen = false,
  rightPanelWidth = 'w-96'
}: TwoPanelLayoutProps) {
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(defaultRightPanelOpen)
  const [isRightPanelMaximized, setIsRightPanelMaximized] = useState(false)
  const rightPanelRef = useRef<HTMLDivElement>(null)

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + \ to toggle right panel
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        setIsRightPanelOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleRightPanel = () => {
    setIsRightPanelOpen(!isRightPanelOpen)
    if (isRightPanelMaximized) {
      setIsRightPanelMaximized(false)
    }
  }

  const toggleMaximize = () => {
    setIsRightPanelMaximized(!isRightPanelMaximized)
  }

  return (
    <div className="flex h-full relative">
      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${
        isRightPanelOpen && !isRightPanelMaximized ? 'mr-0' : ''
      }`}>
        {children}
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleRightPanel}
        className={`absolute top-4 transition-all duration-300 z-20 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 ${
          isRightPanelOpen 
            ? isRightPanelMaximized 
              ? 'right-4' 
              : `right-${rightPanelWidth.replace('w-', '')}`
            : 'right-4'
        }`}
        title={`${isRightPanelOpen ? 'Close' : 'Open'} tool outputs (⌘\\)`}
      >
        {isRightPanelOpen ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Right Panel */}
      <div
        ref={rightPanelRef}
        className={`fixed top-0 right-0 h-full bg-gray-50 border-l border-gray-200 transition-all duration-300 z-10 ${
          isRightPanelOpen ? 'translate-x-0' : 'translate-x-full'
        } ${
          isRightPanelMaximized ? 'w-full' : rightPanelWidth
        }`}
      >
        {/* Right Panel Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <h3 className="text-sm font-medium text-gray-700">{rightPanelTitle}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMaximize}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title={isRightPanelMaximized ? 'Restore' : 'Maximize'}
            >
              {isRightPanelMaximized ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={toggleRightPanel}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Panel Content */}
        <div className="h-[calc(100%-57px)] overflow-y-auto">
          {rightPanel}
        </div>
      </div>

      {/* Overlay for mobile when right panel is open */}
      {isRightPanelOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-0 lg:hidden"
          onClick={toggleRightPanel}
        />
      )}
    </div>
  )
}