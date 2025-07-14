'use client'

import { CheckCircle, AlertTriangle, TrendingUp, Users, Target, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AnalyzeResponsesViewProps {
  arguments: {
    responses?: Array<{
      agent: string
      content: string
    }>
    focus_areas?: string[]
  }
  result: {
    analysis?: {
      key_concerns?: string[]
      consensus?: string[]
      recommendations?: string[]
      summary?: string
    }
    metadata?: {
      total_responses?: number
      agents_involved?: string[]
      analysis_timestamp?: string
      confidence_score?: number
    }
  }
}

export default function AnalyzeResponsesView({ arguments: args, result }: AnalyzeResponsesViewProps) {
  const { responses = [], focus_areas = [] } = args
  const { analysis = {}, metadata = {} } = result
  
  // Extract agent colors
  const getAgentColor = (agentName: string) => {
    const colors = [
      { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
      { bg: 'bg-pink-500', light: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    ]
    const hash = agentName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {analysis.summary && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Executive Summary
          </h3>
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {analysis.summary}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Key Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Key Concerns */}
        {analysis.key_concerns && analysis.key_concerns.length > 0 && (
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h4 className="font-medium text-red-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Key Concerns
            </h4>
            <ul className="space-y-2">
              {analysis.key_concerns.map((concern, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span className="text-sm text-red-800">{concern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Consensus Points */}
        {analysis.consensus && analysis.consensus.length > 0 && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Points of Consensus
            </h4>
            <ul className="space-y-2">
              {analysis.consensus.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-sm text-green-800">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recommendations
            </h4>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">{idx + 1}.</span>
                  <span className="text-sm text-blue-800">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Agent Responses */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            Individual Agent Responses
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {responses.map((response, idx) => {
            const color = getAgentColor(response.agent)
            return (
              <div key={idx} className={`${color.light} ${color.border} border rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 ${color.bg} text-white rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
                    {response.agent.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${color.text} mb-2`}>
                      {response.agent}
                    </h4>
                    <div className="prose prose-sm max-w-none text-gray-700">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {response.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Focus Areas */}
      {focus_areas.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Analysis Focus Areas
          </h4>
          <div className="flex flex-wrap gap-2">
            {focus_areas.map((area, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-white border rounded-full text-sm text-gray-700"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      {metadata.confidence_score && (
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {Math.round(metadata.confidence_score * 100)}%
            </div>
            <div className="text-sm text-gray-600">Confidence Score</div>
          </div>
        </div>
      )}
    </div>
  )
}