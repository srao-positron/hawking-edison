import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Loader2, Clock, ExternalLink, MessageSquare, Eye } from 'lucide-react'
import JsonTreeViewer from './JsonTreeViewer'
import { formatDuration } from '@/utils/format-duration'

interface ToolCardProps {
  toolCall: {
    tool: string
    arguments: any
    tool_call_id: string
    timestamp?: string
  }
  toolResult?: {
    success: boolean
    result?: any
    error?: string
    duration_ms?: number
  }
  isPending: boolean
  onLoadDetails?: (toolCall: any, toolResult: any) => void
}

export default function ToolCard({ toolCall, toolResult, isPending, onLoadDetails }: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
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
  
  const getStatusIcon = () => {
    if (isPending) {
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
    }
    if (!toolResult) {
      return <Clock className="w-4 h-4 text-gray-400" />
    }
    return toolResult.success ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <XCircle className="w-4 h-4 text-red-500" />
  }
  
  const getStatusText = () => {
    if (isPending) return 'Running...'
    if (!toolResult) return 'Pending'
    return toolResult.success ? 'Success' : 'Failed'
  }
  
  const getStatusColor = () => {
    if (isPending) return 'text-blue-600'
    if (!toolResult) return 'text-gray-600'
    return toolResult.success ? 'text-green-600' : 'text-red-600'
  }

  // Format arguments for display
  const formatArguments = (args: any) => {
    if (!args) return 'No arguments'
    
    // Special formatting for common argument patterns
    if (typeof args === 'string') return args
    if (typeof args === 'number') return args.toString()
    if (Array.isArray(args)) return `[${args.length} items]`
    
    // For objects, show key fields
    const keys = Object.keys(args)
    if (keys.length === 0) return 'No arguments'
    if (keys.length === 1) return `${keys[0]}: ${JSON.stringify(args[keys[0]]).substring(0, 50)}...`
    
    // Show first few keys
    return keys.slice(0, 3).map(k => `${k}: ${JSON.stringify(args[k]).substring(0, 30)}...`).join(', ')
  }
  
  return (
    <div className="border rounded-lg">
      <div className="flex items-stretch">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div className="text-left">
              <div className="font-medium text-sm flex items-center gap-2">
                {getToolDisplayName(toolCall.tool)}
                {toolCall.tool === 'runDiscussion' && (
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                )}
              </div>
              <div className="text-xs text-gray-500">{formatArguments(toolCall.arguments)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            {toolResult?.duration_ms && (
              <span className="text-xs text-gray-400">
                {formatDuration(toolResult.duration_ms)}
              </span>
            )}
            {isExpanded ? 
              <ChevronDown className="w-4 h-4 text-gray-400" /> : 
              <ChevronRight className="w-4 h-4 text-gray-400" />
            }
          </div>
        </button>
        
        {/* Quick action button for discussions */}
        {onLoadDetails && toolResult && (toolCall.tool === 'runDiscussion' || toolCall.tool === 'createAgent') && (
          <button
            onClick={() => onLoadDetails(toolCall, toolResult)}
            className="px-4 border-l flex items-center gap-2 hover:bg-blue-50 transition-colors group"
            title="View in new tab"
          >
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
            <span className="text-sm text-gray-600 group-hover:text-blue-600">View</span>
          </button>
        )}
      </div>
      
      {isExpanded && (
        <div className="border-t p-3 bg-gray-50">
          <div className="space-y-3">
            {/* Arguments */}
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Arguments:</div>
              <div className="bg-white p-2 rounded border overflow-x-auto">
                <JsonTreeViewer data={toolCall.arguments} defaultExpanded={true} />
              </div>
            </div>
            
            {/* Result or Error */}
            {toolResult && (
              <div>
                <div className="text-xs font-medium text-gray-700 mb-1">
                  {toolResult.success ? 'Result:' : 'Error:'}
                </div>
                <div className="bg-white p-2 rounded border overflow-x-auto max-h-96">
                  {toolResult.success ? (
                    <JsonTreeViewer data={toolResult.result} defaultExpanded={false} />
                  ) : (
                    <div className="text-xs text-red-600 whitespace-pre-wrap">
                      {toolResult.error}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Load Details Button */}
            {onLoadDetails && toolResult && (
              <div className="mt-3 pt-3 border-t">
                <button
                  onClick={() => onLoadDetails(toolCall, toolResult)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Load Details in New Tab</span>
                </button>
              </div>
            )}
            
            {/* Tool Call ID - subtle visual element */}
            <div className="text-xs text-gray-300 mt-3 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{toolCall.tool_call_id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}