import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'

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
}

export default function ToolCard({ toolCall, toolResult, isPending }: ToolCardProps) {
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
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="text-left">
            <div className="font-medium text-sm">{getToolDisplayName(toolCall.tool)}</div>
            <div className="text-xs text-gray-500">{formatArguments(toolCall.arguments)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          {toolResult?.duration_ms && (
            <span className="text-xs text-gray-400">
              {toolResult.duration_ms}ms
            </span>
          )}
          {isExpanded ? 
            <ChevronDown className="w-4 h-4 text-gray-400" /> : 
            <ChevronRight className="w-4 h-4 text-gray-400" />
          }
        </div>
      </button>
      
      {isExpanded && (
        <div className="border-t p-3 bg-gray-50">
          <div className="space-y-3">
            {/* Arguments */}
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">Arguments:</div>
              <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                {JSON.stringify(toolCall.arguments, null, 2)}
              </pre>
            </div>
            
            {/* Result or Error */}
            {toolResult && (
              <div>
                <div className="text-xs font-medium text-gray-700 mb-1">
                  {toolResult.success ? 'Result:' : 'Error:'}
                </div>
                <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-60">
                  {toolResult.success 
                    ? JSON.stringify(toolResult.result, null, 2)
                    : toolResult.error
                  }
                </pre>
              </div>
            )}
            
            {/* Tool Call ID for debugging */}
            <div className="text-xs text-gray-400">
              ID: {toolCall.tool_call_id}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}