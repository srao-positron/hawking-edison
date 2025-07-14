'use client'

import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface JsonTreeViewerProps {
  data: any
  defaultExpanded?: boolean
  maxDepth?: number
}

// Helper to detect if a string contains JSON
function tryParseJson(str: string): any | null {
  if (typeof str !== 'string') return null
  
  // Quick check if it might be JSON
  const trimmed = str.trim()
  if ((!trimmed.startsWith('{') && !trimmed.startsWith('[')) || 
      (!trimmed.endsWith('}') && !trimmed.endsWith(']'))) {
    return null
  }
  
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

// Helper to detect if a string contains markdown
function isMarkdown(str: string): boolean {
  if (typeof str !== 'string' || str.length < 3) return false
  
  // Check for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s/m,           // Headers
    /\*\*[^*]+\*\*/,        // Bold
    /\*[^*]+\*/,            // Italic
    /\[([^\]]+)\]\([^)]+\)/, // Links
    /^[-*+]\s/m,            // Unordered lists
    /^\d+\.\s/m,            // Ordered lists
    /^>\s/m,                // Blockquotes
    /```[\s\S]*?```/,       // Code blocks (matches across newlines)
    /`[^`]+`/,              // Inline code
    /!\[([^\]]*)\]\([^)]+\)/, // Images
    /^---+$/m,              // Horizontal rules
  ]
  
  return markdownPatterns.some(pattern => pattern.test(str))
}

// Helper to format property names
function formatPropertyName(name: string): string {
  // Convert snake_case and camelCase to readable format
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

interface JsonNodeProps {
  name: string | number
  value: any
  depth: number
  maxDepth: number
  defaultExpanded: boolean
  isArrayItem?: boolean
  path: string[]
}

function JsonNode({ name, value, depth, maxDepth, defaultExpanded, isArrayItem = false, path }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    // Auto-expand based on depth and content
    if (depth >= maxDepth) return false
    if (defaultExpanded && depth < 2) return true
    
    // Auto-expand important properties
    const importantProps = ['text', 'content', 'body', 'message', 'error', 'data', 'result']
    if (typeof name === 'string' && importantProps.includes(name.toLowerCase())) return true
    
    // Auto-expand small objects/arrays
    if (typeof value === 'object' && value !== null) {
      const size = Array.isArray(value) ? value.length : Object.keys(value).length
      return size <= 3 && depth < 3
    }
    
    return false
  })
  
  const [copied, setCopied] = useState(false)
  
  // Check if this value might contain nested JSON
  const nestedJson = useMemo(() => {
    if (typeof value === 'string' && value.length > 10) {
      const propertyName = typeof name === 'string' ? name.toLowerCase() : ''
      if (['text', 'content', 'body', 'data', 'response', 'result', 'output'].includes(propertyName)) {
        return tryParseJson(value)
      }
    }
    return null
  }, [name, value])
  
  const handleCopy = () => {
    const textToCopy = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const renderValue = () => {
    // If we found nested JSON, render it as a tree
    if (nestedJson) {
      return (
        <div className="ml-4 mt-1">
          <div className="text-xs text-gray-500 mb-1">Nested JSON:</div>
          <JsonTreeViewer data={nestedJson} defaultExpanded={false} maxDepth={maxDepth - depth} />
        </div>
      )
    }
    
    if (value === null) return <span className="text-gray-400">null</span>
    if (value === undefined) return <span className="text-gray-400">undefined</span>
    
    if (typeof value === 'boolean') {
      return <span className={value ? 'text-green-600' : 'text-red-600'}>{String(value)}</span>
    }
    
    if (typeof value === 'number') {
      return <span className="text-blue-600">{value}</span>
    }
    
    if (typeof value === 'string') {
      // Check if it's a URL
      if (value.match(/^https?:\/\//)) {
        return (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            {value}
          </a>
        )
      }
      
      // Check if it's markdown
      if (isMarkdown(value) && value.length > 50) {
        return (
          <div className="mt-1">
            <div className="prose prose-sm max-w-none bg-gray-50 rounded p-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            </div>
          </div>
        )
      }
      
      // Regular string
      if (value.length > 100 && value.includes('\n')) {
        // Long multiline string
        return (
          <div className="mt-1">
            <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
              {value}
            </pre>
          </div>
        )
      }
      
      return <span className="text-gray-700">"{value}"</span>
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-400">[]</span>
      
      return (
        <div className="ml-4">
          {value.map((item, index) => (
            <JsonNode
              key={`${path.join('.')}.${index}`}
              name={index}
              value={item}
              depth={depth + 1}
              maxDepth={maxDepth}
              defaultExpanded={defaultExpanded}
              isArrayItem={true}
              path={[...path, String(index)]}
            />
          ))}
        </div>
      )
    }
    
    if (typeof value === 'object') {
      const entries = Object.entries(value)
      if (entries.length === 0) return <span className="text-gray-400">{'{}'}</span>
      
      return (
        <div className="ml-4">
          {entries.map(([key, val]) => (
            <JsonNode
              key={`${path.join('.')}.${key}`}
              name={key}
              value={val}
              depth={depth + 1}
              maxDepth={maxDepth}
              defaultExpanded={defaultExpanded}
              path={[...path, key]}
            />
          ))}
        </div>
      )
    }
    
    return <span className="text-gray-500">{String(value)}</span>
  }
  
  const isExpandable = 
    (typeof value === 'object' && value !== null && 
     (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)) ||
    nestedJson !== null
  
  const displayName = isArrayItem ? `[${name}]` : formatPropertyName(String(name))
  
  return (
    <div className="py-0.5">
      <div className="flex items-start gap-1 group">
        {isExpandable && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-500" />
            )}
          </button>
        )}
        
        {!isExpandable && <div className="w-4" />}
        
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-700">
            {displayName}
            {!isArrayItem && ':'}
          </span>
          
          {(!isExpandable || !isExpanded) && (
            <>
              <span className="mx-1" />
              {isExpandable && !isExpanded ? (
                <span className="text-sm text-gray-400">
                  {Array.isArray(value) 
                    ? `[${value.length} items]` 
                    : `{${Object.keys(value).length} properties}`
                  }
                </span>
              ) : (
                renderValue()
              )}
            </>
          )}
        </div>
        
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-opacity"
          title="Copy value"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-600" />
          ) : (
            <Copy className="w-3 h-3 text-gray-400" />
          )}
        </button>
      </div>
      
      {isExpandable && isExpanded && (
        <div className="ml-2 border-l border-gray-200 pl-2">
          {renderValue()}
        </div>
      )}
    </div>
  )
}

export default function JsonTreeViewer({ data, defaultExpanded = true, maxDepth = 10 }: JsonTreeViewerProps) {
  if (data === null || data === undefined) {
    return <div className="text-gray-400 text-sm">No data</div>
  }
  
  // If it's a simple value, just render it directly
  if (typeof data !== 'object') {
    return <JsonNode name="value" value={data} depth={0} maxDepth={maxDepth} defaultExpanded={defaultExpanded} path={[]} />
  }
  
  // If it's an array or object, render the tree
  if (Array.isArray(data)) {
    return (
      <div className="font-mono text-xs">
        {data.map((item, index) => (
          <JsonNode
            key={index}
            name={index}
            value={item}
            depth={0}
            maxDepth={maxDepth}
            defaultExpanded={defaultExpanded}
            isArrayItem={true}
            path={[String(index)]}
          />
        ))}
      </div>
    )
  }
  
  return (
    <div className="font-mono text-xs">
      {Object.entries(data).map(([key, value]) => (
        <JsonNode
          key={key}
          name={key}
          value={value}
          depth={0}
          maxDepth={maxDepth}
          defaultExpanded={defaultExpanded}
          path={[key]}
        />
      ))}
    </div>
  )
}