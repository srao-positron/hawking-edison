'use client'

import { useState } from 'react'
import { Wrench, Clock, CheckCircle, XCircle, Copy, Check, Eye, Sparkles } from 'lucide-react'
import JsonTreeViewer from './orchestration/JsonTreeViewer'
import { formatDistanceToNow } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatDuration } from '@/utils/format-duration'
import AnalyzeResponsesView from './tools/AnalyzeResponsesView'

interface ToolDetailProps {
  toolCall: {
    tool: string
    arguments: any
    tool_call_id: string
    timestamp?: string
  }
  toolResult: {
    success: boolean
    result?: any
    error?: string
    duration_ms?: number
    summary?: string  // AI-generated summary from Lambda
  }
}

export default function ToolDetail({ toolCall, toolResult }: ToolDetailProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const handleCopy = (section: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const getToolDisplayName = (toolName: string) => {
    if (toolName.startsWith('mcp_')) {
      const parts = toolName.replace('mcp_', '').split('_')
      const service = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
      const action = parts.slice(1).join(' ')
      return `${service}: ${action.replace(/([A-Z])/g, ' $1').trim()}`
    }
    // Convert camelCase to Title Case
    return toolName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  // Helper to generate consistent colors for agents
  const getAgentColor = (agentName: string) => {
    const colors = [
      { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-50', border: 'border-blue-200' },
      { bg: 'bg-purple-500', text: 'text-purple-500', light: 'bg-purple-50', border: 'border-purple-200' },
      { bg: 'bg-green-500', text: 'text-green-500', light: 'bg-green-50', border: 'border-green-200' },
      { bg: 'bg-orange-500', text: 'text-orange-500', light: 'bg-orange-50', border: 'border-orange-200' },
      { bg: 'bg-pink-500', text: 'text-pink-500', light: 'bg-pink-50', border: 'border-pink-200' },
      { bg: 'bg-indigo-500', text: 'text-indigo-500', light: 'bg-indigo-50', border: 'border-indigo-200' },
    ]
    const hash = agentName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  // Generate AI summary for the tool execution
  const generateAISummary = () => {
    if (toolCall.tool === 'runDiscussion' && toolResult.result) {
      const participants = toolCall.arguments.agents?.length || 0
      const turns = toolResult.result.discussion?.length || 0
      const topic = toolCall.arguments.topic || 'unknown topic'
      
      return `${participants} agents engaged in ${turns} exchanges about "${topic}". The discussion ${
        toolResult.result.style === 'debate' ? 'featured opposing viewpoints' : 
        toolResult.result.style === 'collaborative' ? 'built consensus collaboratively' :
        'explored multiple perspectives'
      } to reach comprehensive insights.`
    }
    
    if (toolCall.tool === 'createAgent' && toolResult.result) {
      const agent = toolResult.result
      return `Created "${agent.name}" - ${agent.specification || 'a specialized agent'}. This expert will ${
        agent.expertise ? `bring expertise in ${Array.isArray(agent.expertise) ? agent.expertise.join(', ') : agent.expertise}` : 
        'contribute unique perspectives to the analysis'
      }.`
    }
    
    if (toolCall.tool === 'analyzeResponses' && toolResult.result) {
      const analysis = toolResult.result.analysis || {}
      const concerns = analysis.key_concerns?.length || 0
      const consensus = analysis.consensus?.length || 0
      const recommendations = analysis.recommendations?.length || 0
      
      return `Analyzed responses from ${toolCall.arguments.responses?.length || 0} agents, identifying ${
        concerns} key concerns, ${consensus} consensus points, and ${recommendations} actionable recommendations. ${
        analysis.summary ? 'The analysis reveals critical insights for decision-making.' : ''
      }`
    }
    
    if (toolCall.tool === 'gatherResponses' && toolResult.result) {
      const responses = toolResult.result.responses || []
      return `Gathered ${responses.length} independent perspectives on "${
        toolCall.arguments.prompt || 'the topic'
      }". Each agent provided unique insights based on their expertise.`
    }
    
    // Generic summary for other tools
    if (toolResult.success) {
      return `Successfully executed ${getToolDisplayName(toolCall.tool)} in ${
        toolResult.duration_ms ? formatDuration(toolResult.duration_ms) : 'a timely manner'
      }. The operation completed with the expected results.`
    } else {
      return `Failed to execute ${getToolDisplayName(toolCall.tool)}. ${
        toolResult.error ? 'An error occurred during processing.' : 'The operation did not complete successfully.'
      }`
    }
  }

  // Custom rendering for specific native tools
  const renderCustomView = () => {
    // Discussion tool - render as professional multi-party conversation
    if (toolCall.tool === 'runDiscussion' && toolResult.result) {
      const result = toolResult.result
      const agents = toolCall.arguments.agents || []
      
      console.log('[ToolDetail] runDiscussion result:', result)
      console.log('[ToolDetail] toolResult full:', toolResult)
      
      // Group turns by round for better visualization
      const turnsByRound: { [key: number]: any[] } = {}
      // Handle both old format (turns) and new format (discussion)
      const discussionArray = result.discussion || result.turns || []
      
      console.log('[ToolDetail] discussionArray:', discussionArray)
      
      if (discussionArray.length > 0) {
        discussionArray.forEach((turn: any) => {
          const round = turn.round || 1
          if (!turnsByRound[round]) turnsByRound[round] = []
          // Normalize the data structure
          turnsByRound[round].push({
            agent_name: turn.agent_name || turn.agent,
            message: turn.message || turn.content,
            round: turn.round,
            timestamp: turn.timestamp
          })
        })
      }
      
      // Extract unique agents from the discussion
      const uniqueAgents = new Set<string>()
      discussionArray.forEach((turn: any) => {
        const agentName = turn.agent_name || turn.agent
        if (agentName) uniqueAgents.add(agentName)
      })
      
      return (
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Header Section */}
          <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Multi-Agent Discussion</h3>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-gray-700">{uniqueAgents.size} Participants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-gray-700">{discussionArray.length || 0} Messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700">{Object.keys(turnsByRound).length} Rounds</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full shadow-sm">
                <span className="text-xs font-medium text-gray-600">Style:</span>
                <span className="text-xs font-semibold text-gray-900">{result.style || toolCall.arguments.style}</span>
              </div>
            </div>
            
            {/* Topic */}
            <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Discussion Topic</div>
                  <div className="text-gray-900 font-medium">{result.topic || toolCall.arguments.topic}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Participants Section */}
          {uniqueAgents.size > 0 && (
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Participants</div>
              <div className="flex flex-wrap gap-3">
                {Array.from(uniqueAgents).map((agentName) => {
                  const color = getAgentColor(agentName)
                  const agent = agents.find((a: any) => a.name === agentName)
                  return (
                    <div key={agentName} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm">
                      <div className={`w-8 h-8 ${color.bg} text-white rounded-full flex items-center justify-center font-bold text-sm`}>
                        {agentName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900">{agentName}</div>
                        {agent?.role && (
                          <div className="text-xs text-gray-500">{agent.role}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Discussion Content */}
          <div className="p-6">
            {Object.keys(turnsByRound).length > 0 ? (
              <div className="space-y-8">
                {Object.entries(turnsByRound).sort(([a], [b]) => Number(a) - Number(b)).map(([round, turns]) => (
                  <div key={round}>
                    {/* Round Header */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1 h-px bg-gray-200"></div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">Round {round}</span>
                      </div>
                      <div className="flex-1 h-px bg-gray-200"></div>
                    </div>
                    
                    {/* Messages in this round */}
                    <div className="space-y-4">
                      {turns.map((turn: any, idx: number) => {
                        const color = getAgentColor(turn.agent_name)
                        const isLastInRound = idx === turns.length - 1
                        
                        return (
                          <div key={idx} className="flex gap-4 group">
                            <div className="flex-shrink-0 flex flex-col items-center">
                              <div className={`w-10 h-10 ${color.bg} text-white rounded-full flex items-center justify-center font-bold shadow-md`}>
                                {turn.agent_name?.charAt(0).toUpperCase() || 'A'}
                              </div>
                              {!isLastInRound && (
                                <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-baseline gap-3 mb-2">
                                <span className={`font-semibold ${color.text}`}>{turn.agent_name}</span>
                                {turn.timestamp && (
                                  <span className="text-xs text-gray-400">
                                    {formatDistanceToNow(new Date(turn.timestamp), { addSuffix: true })}
                                  </span>
                                )}
                              </div>
                              <div className={`${color.light} ${color.border} border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow`}>
                                <div className="prose prose-xs max-w-none text-sm leading-relaxed">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {turn.message}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-12">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-500">No discussion messages recorded</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Agent creation tool - show agent details
    if (toolCall.tool === 'createAgent' && toolResult.result) {
      const agent = toolResult.result
      return (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Agent Details</h3>
          
          <div className="space-y-4">
            <div>
              <div className="font-medium text-sm text-gray-700 mb-1">Name</div>
              <div className="text-lg font-semibold text-gray-900">{agent.name}</div>
            </div>
            
            <div>
              <div className="font-medium text-sm text-gray-700 mb-1">Specification</div>
              <div className="bg-gray-50 p-4 rounded prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {agent.specification}
                </ReactMarkdown>
              </div>
            </div>
            
            {agent.expertise && (
              <div>
                <div className="font-medium text-sm text-gray-700 mb-1">Expertise</div>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(agent.expertise) ? (
                    agent.expertise.map((skill: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-700">{agent.expertise}</span>
                  )}
                </div>
              </div>
            )}
            
            {agent.persona && (
              <div>
                <div className="font-medium text-sm text-gray-700 mb-1">Persona</div>
                <div className="bg-gray-50 p-4 rounded prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {agent.persona}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Analyze Responses tool - show visual analysis
    if (toolCall.tool === 'analyzeResponses' && toolResult.result) {
      return (
        <AnalyzeResponsesView 
          arguments={toolCall.arguments}
          result={toolResult.result}
        />
      )
    }

    // Default to standard view
    return null
  }

  const customView = renderCustomView()

  // Use stored summary from Lambda if available, otherwise use fallback
  const aiSummary = toolResult.summary || generateAISummary()

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className={`container mx-auto p-6 ${toolCall.tool === 'runDiscussion' ? 'max-w-7xl' : 'max-w-5xl'}`}>
        {/* AI Summary Badge - only show if we have a summary */}
        {aiSummary && (
          <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Quick Summary</h3>
                <p className="text-sm text-gray-800 leading-relaxed">{aiSummary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-6 h-6 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">{getToolDisplayName(toolCall.tool)}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {toolResult.duration_ms && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(toolResult.duration_ms)}
              </span>
            )}
            {toolResult.duration_ms && <span>•</span>}
            <span className={`flex items-center gap-1 font-medium ${
              toolResult.success ? 'text-green-600' : 'text-red-600'
            }`}>
              {toolResult.success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Success
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Failed
                </>
              )}
            </span>
          </div>
        </div>

        {/* Custom view for specific tools */}
        {customView}

        {/* Standard view sections */}
        <div className={`space-y-6 ${customView ? 'mt-6' : ''}`}>
          {/* Arguments Section */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Arguments</h2>
              <button
                onClick={() => handleCopy('arguments', JSON.stringify(toolCall.arguments, null, 2))}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              >
                {copiedSection === 'arguments' ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-4">
              <JsonTreeViewer data={toolCall.arguments} defaultExpanded={true} />
            </div>
          </div>

          {/* Result/Error Section */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {toolResult.success ? 'Result' : 'Error'}
              </h2>
              <button
                onClick={() => handleCopy(
                  'result', 
                  toolResult.success 
                    ? JSON.stringify(toolResult.result, null, 2)
                    : toolResult.error || ''
                )}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              >
                {copiedSection === 'result' ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-4">
              {toolResult.success ? (
                <JsonTreeViewer data={toolResult.result} defaultExpanded={false} />
              ) : (
                <div className="text-red-600 whitespace-pre-wrap font-mono text-sm">
                  {toolResult.error}
                </div>
              )}
            </div>
          </div>

          {/* Raw Data Section (Collapsed by default) */}
          <details className="bg-white rounded-lg shadow-sm border">
            <summary className="p-4 border-b cursor-pointer hover:bg-gray-50">
              <span className="text-lg font-semibold">Raw Data</span>
            </summary>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2">Tool Call</h3>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(toolCall, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2">Tool Result</h3>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(toolResult, null, 2)}
                </pre>
              </div>
            </div>
          </details>
          
          {/* Subtle ID at bottom */}
          <div className="flex justify-center mt-8 text-xs text-gray-300">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>ID: {toolCall.tool_call_id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}