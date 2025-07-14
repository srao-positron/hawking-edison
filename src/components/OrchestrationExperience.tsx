'use client'

import { useState } from 'react'
import { ToggleLeft, ToggleRight, Sparkles, Code } from 'lucide-react'
import OrchestrationStoryboard from './OrchestrationStoryboard'
import OrchestrationPanelV2 from './OrchestrationPanelV2'

interface OrchestrationExperienceProps {
  sessionId: string | null
  isVisible: boolean
  onClose?: () => void
  fullScreen?: boolean
  onOpenToolDetails?: (toolCall: any, toolResult: any) => void
}

export default function OrchestrationExperience({ 
  sessionId, 
  isVisible, 
  onClose, 
  fullScreen = false,
  onOpenToolDetails 
}: OrchestrationExperienceProps) {
  // Get user preference from localStorage (default to storyboard for non-technical users)
  const [viewMode, setViewMode] = useState<'story' | 'technical'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('orchestrationViewMode') as 'story' | 'technical') || 'story'
    }
    return 'story'
  })

  const toggleViewMode = () => {
    const newMode = viewMode === 'story' ? 'technical' : 'story'
    setViewMode(newMode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('orchestrationViewMode', newMode)
    }
  }

  if (!isVisible) return null

  return (
    <>
      {/* View mode toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleViewMode}
          className="bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-3 hover:shadow-xl transition-all border"
        >
          {viewMode === 'story' ? (
            <>
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Story View</span>
              <ToggleLeft className="w-5 h-5 text-gray-400" />
            </>
          ) : (
            <>
              <Code className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Technical View</span>
              <ToggleRight className="w-5 h-5 text-gray-400" />
            </>
          )}
        </button>
      </div>

      {/* Render appropriate view */}
      {viewMode === 'story' ? (
        <OrchestrationStoryboard
          sessionId={sessionId}
          isVisible={isVisible}
          onClose={onClose}
          onOpenToolDetails={onOpenToolDetails}
        />
      ) : (
        <OrchestrationPanelV2
          sessionId={sessionId}
          isVisible={isVisible}
          onClose={onClose}
          fullScreen={fullScreen}
          onOpenToolDetails={onOpenToolDetails}
        />
      )}
    </>
  )
}