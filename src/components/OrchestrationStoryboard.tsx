'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Brain, MessageSquare, Target, Lightbulb, TrendingUp, CheckCircle, AlertCircle, Clock, Sparkles, ChevronRight, Play, Pause, FastForward } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useOrchestrationStore, type OrchestrationEvent } from '@/stores/orchestration-store'

interface OrchestrationStoryboardProps {
  sessionId: string | null
  isVisible: boolean
  onClose?: () => void
  onOpenToolDetails?: (toolCall: any, toolResult: any) => void
}

// Agent avatar component with personality
interface AgentAvatarProps {
  agent: { name: string; role?: string; expertise?: string[] }
  size?: 'sm' | 'md' | 'lg'
  showThinking?: boolean
}

const AgentAvatar = ({ agent, size = 'md', showThinking = false }: AgentAvatarProps) => {
  const sizes = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-base',
    lg: 'w-20 h-20 text-xl'
  }
  
  const colors = [
    { bg: 'from-blue-400 to-blue-600', ring: 'ring-blue-300' },
    { bg: 'from-purple-400 to-purple-600', ring: 'ring-purple-300' },
    { bg: 'from-green-400 to-green-600', ring: 'ring-green-300' },
    { bg: 'from-orange-400 to-orange-600', ring: 'ring-orange-300' },
    { bg: 'from-pink-400 to-pink-600', ring: 'ring-pink-300' },
  ]
  
  const hash = agent.name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
  const color = colors[hash % colors.length]
  
  return (
    <div className="relative">
      <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${color.bg} text-white font-bold flex items-center justify-center shadow-lg ring-4 ring-white ${showThinking ? 'animate-pulse' : ''}`}>
        {agent.name.charAt(0).toUpperCase()}
      </div>
      {showThinking && (
        <div className="absolute -top-1 -right-1">
          <Brain className="w-5 h-5 text-purple-600 animate-bounce" />
        </div>
      )}
      <div className="text-center mt-2">
        <div className="font-medium text-sm">{agent.name}</div>
        <div className="text-xs text-gray-500 line-clamp-1 max-w-[100px]">{agent.role || agent.expertise?.[0] || 'Expert'}</div>
      </div>
    </div>
  )
}

// Story phase component
const StoryPhase = ({ phase, isActive, agents, events }: any) => {
  const getPhaseIcon = () => {
    switch (phase.type) {
      case 'assembling': return <Users className="w-6 h-6" />
      case 'discussing': return <MessageSquare className="w-6 h-6" />
      case 'analyzing': return <Brain className="w-6 h-6" />
      case 'concluding': return <CheckCircle className="w-6 h-6" />
      default: return <Target className="w-6 h-6" />
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${isActive ? 'scale-100' : 'scale-95 opacity-75'} transition-all duration-300`}
    >
      <div className={`bg-white rounded-2xl shadow-lg p-6 ${isActive ? 'ring-4 ring-blue-400 ring-opacity-50' : ''}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-xl ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
            {getPhaseIcon()}
          </div>
          <div>
            <h3 className="font-bold text-lg">{phase.title}</h3>
            <p className="text-sm text-gray-600">{phase.description}</p>
          </div>
          {isActive && (
            <div className="ml-auto">
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Clock className="w-4 h-4" />
                <span>In Progress</span>
              </div>
            </div>
          )}
        </div>
        
        {phase.agents && phase.agents.length > 0 && (
          <div className="flex items-center gap-4 mt-4">
            {phase.agents.map((agent: any) => (
              <AgentAvatar key={agent.id} agent={agent} size="sm" showThinking={isActive} />
            ))}
          </div>
        )}
        
        {phase.insights && phase.insights.length > 0 && (
          <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">What's Happening</h4>
            <div className="space-y-2">
              {phase.insights.map((insight: string, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <Lightbulb className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 leading-relaxed">{insight}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Main orchestration panel
export default function OrchestrationStoryboard({ 
  sessionId, 
  isVisible, 
  onClose,
  onOpenToolDetails 
}: OrchestrationStoryboardProps) {
  // Zustand store
  const { 
    loadSession, 
    getSessionData,
    setActiveSession,
    subscribeToSession,
    unsubscribeFromSession,
    loadingStates
  } = useOrchestrationStore()
  
  const [currentPhase, setCurrentPhase] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [storyNarrative, setStoryNarrative] = useState('')
  
  // Get loading state
  const isLoading = sessionId ? loadingStates.get(sessionId) || false : false
  
  // Get session data
  const sessionData = sessionId ? getSessionData(sessionId) : null
  const { 
    info: sessionInfo, 
    events = [], 
    agents = [], 
    discussions = [], 
    toolCalls = [], 
    toolResults = new Map()
  } = sessionData || {}
  
  const status = sessionInfo?.status || 'pending'

  useEffect(() => {
    if (!sessionId) return

    const existingData = getSessionData(sessionId)
    if (!existingData.info && isVisible) {
      setActiveSession(sessionId)
      loadSession(sessionId)
    }
    
    if (isVisible) {
      subscribeToSession(sessionId)
    }
    
    return () => {
      if (!isVisible) {
        unsubscribeFromSession(sessionId)
      }
    }
  }, [sessionId, isVisible, setActiveSession, loadSession, getSessionData, subscribeToSession, unsubscribeFromSession])

  // Generate story phases based on orchestration progress
  const generateStoryPhases = () => {
    const phases = []
    
    // Get phase summaries and tool summaries from events
    const phaseSummaryEvents = events.filter(e => e.event_type === 'phase_summary')
    const latestPhaseSummary = phaseSummaryEvents[0]?.event_data
    
    // Get tool result summaries
    const toolSummaries = Array.from(toolResults.values())
      .map((tr) => {
        const toolCall = toolCalls.find(tc => tc.tool_call_id === tr.tool_call_id)
        return {
          tool: toolCall?.tool,
          summary: tr.summary,
          result: tr.result
        }
      })
      .filter(ts => ts.summary)
    
    // Phase 1: Team Assembly
    if (agents.length > 0) {
      const agentSummaries = toolSummaries
        .filter(ts => ts.tool === 'createAgent')
        .map(ts => ts.summary)
      
      phases.push({
        type: 'assembling',
        title: 'Assembling the Team',
        description: latestPhaseSummary?.phase === 'team_building' && latestPhaseSummary?.description
          ? latestPhaseSummary.description
          : `Bringing together ${agents.length} expert${agents.length > 1 ? 's' : ''} for this challenge`,
        agents: agents.slice(0, 3),
        insights: agentSummaries.length > 0
          ? agentSummaries
          : agents.map(a => `${a.name} joins with expertise in ${a.specification}`),
        contextual: latestPhaseSummary?.insight
      })
    }
    
    // Phase 2: Discussion & Analysis
    const discussionSummaries = toolSummaries.filter(ts => ts.tool === 'runDiscussion')
    const gatherSummaries = toolSummaries.filter(ts => ts.tool === 'gatherResponses')
    
    if (discussionSummaries.length > 0 || gatherSummaries.length > 0) {
      phases.push({
        type: 'discussing',
        title: 'Team Collaboration',
        description: latestPhaseSummary?.phase === 'collaboration' && latestPhaseSummary?.description
          ? latestPhaseSummary.description
          : 'The team is actively discussing your question',
        agents: agents.slice(0, Math.min(5, agents.length)),
        insights: [...discussionSummaries, ...gatherSummaries]
          .map(ts => ts.summary)
          .filter(Boolean)
          .slice(0, 3),
        contextual: latestPhaseSummary?.phase === 'collaboration' ? latestPhaseSummary?.insight : null
      })
    }
    
    // Phase 3: Synthesis & Analysis
    const analysisSummaries = toolSummaries.filter(ts => ts.tool === 'analyzeResponses')
    
    if (analysisSummaries.length > 0) {
      phases.push({
        type: 'analyzing',
        title: 'Synthesizing Insights',
        description: latestPhaseSummary?.phase === 'synthesis' && latestPhaseSummary?.description
          ? latestPhaseSummary.description
          : 'Analyzing and synthesizing team findings',
        insights: analysisSummaries
          .map(ts => ts.summary)
          .filter(Boolean),
        contextual: latestPhaseSummary?.phase === 'synthesis' ? latestPhaseSummary?.insight : null
      })
    }
    
    // Phase 4: Conclusions
    if (status === 'completed') {
      // Try to find the final analysis or last meaningful summary
      const finalAnalysis = toolSummaries.find(ts => ts.tool === 'analyzeResponses')
      const lastDiscussion = toolSummaries.filter(ts => ts.tool === 'runDiscussion').pop()
      const finalInsights = [finalAnalysis?.summary, lastDiscussion?.summary].filter(Boolean)
      
      phases.push({
        type: 'concluding',
        title: 'Final Recommendations',
        description: latestPhaseSummary?.userQuestion 
          ? `Team's conclusions for: "${latestPhaseSummary.userQuestion.slice(0, 80)}..."`
          : 'The team presents their unified findings',
        agents: agents,
        insights: finalInsights.length > 0
          ? finalInsights
          : ['Analysis complete', 'Recommendations prepared'],
        contextual: latestPhaseSummary?.insight
      })
    }
    
    return phases
  }

  // Generate narrative based on current state
  useEffect(() => {
    if (status === 'pending') {
      setStoryNarrative('Preparing to tackle your challenge...')
    } else if (status === 'running') {
      if (agents.length === 0) {
        setStoryNarrative('Setting up the expert team for your request...')
      } else if (discussions.length > 0) {
        setStoryNarrative(`${agents.length} experts are collaborating to find the best solution...`)
      } else {
        setStoryNarrative('The team is analyzing your request from multiple perspectives...')
      }
    } else if (status === 'completed') {
      setStoryNarrative('The team has completed their analysis! Review their findings below.')
    } else if (status === 'failed') {
      setStoryNarrative('The team encountered challenges. Let\'s try a different approach.')
    }
  }, [status, agents.length, discussions.length])

  const phases = generateStoryPhases()

  // Auto-advance phases
  useEffect(() => {
    if (isPlaying && phases.length > 0 && status !== 'completed' && status !== 'failed') {
      const timer = setInterval(() => {
        setCurrentPhase(prev => (prev + 1) % phases.length)
      }, 5000)
      return () => clearInterval(timer)
    }
  }, [isPlaying, phases.length, status])

  // Jump to last phase when completed
  useEffect(() => {
    if (status === 'completed' && phases.length > 0) {
      setCurrentPhase(phases.length - 1)
      setIsPlaying(false)
    }
  }, [status, phases.length])

  if (!isVisible) return null

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-32 h-32 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-blue-200 rounded-full animate-ping" />
            <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center">
              <Brain className="w-16 h-16 text-blue-600 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Preparing Your Team</h2>
          <p className="text-gray-600">Assembling the right experts for your challenge...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden" style={{ marginLeft: '300px' }}>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your AI Team at Work</h1>
            <p className="text-lg text-gray-600">{storyNarrative}</p>
          </div>
          
          {/* Playback controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPhase(Math.max(0, currentPhase - 1))}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setCurrentPhase((currentPhase + 1) % phases.length)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-full overflow-y-auto pb-40">
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-12">
            {phases.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentPhase ? 'w-12 bg-blue-600' : 
                  idx < currentPhase ? 'w-8 bg-blue-300' : 
                  'w-8 bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Story phases */}
          <AnimatePresence mode="wait">
            {phases[currentPhase] && (
              <StoryPhase
                key={currentPhase}
                phase={phases[currentPhase]}
                isActive={true}
                agents={agents}
                events={events}
              />
            )}
          </AnimatePresence>

          {/* Key insights panel */}
          {(status === 'completed' || toolResults.size > 3) && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-8 h-8 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900">Key Insights from Your Team</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6">
                  <TrendingUp className="w-8 h-8 text-green-600 mb-3" />
                  <h3 className="font-bold text-lg mb-2">Opportunities</h3>
                  <p className="text-gray-700">3 strategic opportunities identified for growth</p>
                </div>
                
                <div className="bg-white rounded-xl p-6">
                  <AlertCircle className="w-8 h-8 text-orange-600 mb-3" />
                  <h3 className="font-bold text-lg mb-2">Considerations</h3>
                  <p className="text-gray-700">5 important factors to consider moving forward</p>
                </div>
                
                <div className="bg-white rounded-xl p-6">
                  <Target className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-bold text-lg mb-2">Next Steps</h3>
                  <p className="text-gray-700">Clear action plan with prioritized recommendations</p>
                </div>
              </div>
              
              <button className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                View Detailed Analysis
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Team roster (collapsible) */}
      <div className="fixed bottom-0 right-0 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-tl-2xl shadow-lg transition-all duration-300" style={{ left: '300px', maxWidth: 'calc(100% - 300px)', maxHeight: '80px', zIndex: 10 }}>
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
              <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Your Team:</span>
              <div className="flex items-center gap-3">
                {agents.slice(0, 8).map((agent) => (
                  <AgentAvatar key={agent.id} agent={agent} size="sm" />
                ))}
                {agents.length > 5 && (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    +{agents.length - 5}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">{toolCalls.length} actions taken</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{formatDistanceToNow(new Date(sessionInfo?.created_at || Date.now()), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}