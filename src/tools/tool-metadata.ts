// Tool metadata for user-friendly display in the Orchestration Panel

import { generateMCPToolMetadata, formatMCPToolArguments, formatMCPToolResult } from './mcp-tool-formatter'

export interface ToolMetadata {
  name: string
  friendlyName: string
  description: string
  icon?: string
  category: 'agent' | 'interaction' | 'analysis' | 'visualization' | 'memory' | 'external'
  resultRenderer?: (result: any) => React.ReactNode
}

export const toolMetadata: Record<string, ToolMetadata> = {
  createAgent: {
    name: 'createAgent',
    friendlyName: 'Create Agent',
    description: 'Creates a specialized AI agent with specific expertise',
    icon: '🤖',
    category: 'agent'
  },
  
  createMultipleAgents: {
    name: 'createMultipleAgents',
    friendlyName: 'Create Multiple Agents',
    description: 'Creates several AI agents at once',
    icon: '👥',
    category: 'agent'
  },
  
  runDiscussion: {
    name: 'runDiscussion',
    friendlyName: 'Run Discussion',
    description: 'Facilitates a discussion between agents on a topic',
    icon: '💬',
    category: 'interaction'
  },
  
  gatherIndependentResponses: {
    name: 'gatherIndependentResponses',
    friendlyName: 'Gather Responses',
    description: 'Collects independent responses from multiple agents',
    icon: '📊',
    category: 'interaction'
  },
  
  analyzeResults: {
    name: 'analyzeResults',
    friendlyName: 'Analyze Results',
    description: 'Analyzes and synthesizes responses from agents',
    icon: '🔍',
    category: 'analysis'
  },
  
  findConsensus: {
    name: 'findConsensus',
    friendlyName: 'Find Consensus',
    description: 'Identifies areas of agreement among agents',
    icon: '🤝',
    category: 'analysis'
  },
  
  createVisualization: {
    name: 'createVisualization',
    friendlyName: 'Create Visualization',
    description: 'Generates visual representations of data',
    icon: '📈',
    category: 'visualization'
  },
  
  generateReport: {
    name: 'generateReport',
    friendlyName: 'Generate Report',
    description: 'Creates a comprehensive report of findings',
    icon: '📄',
    category: 'visualization'
  },
  
  saveMemory: {
    name: 'saveMemory',
    friendlyName: 'Save to Memory',
    description: 'Stores information for future reference',
    icon: '💾',
    category: 'memory'
  },
  
  searchMemory: {
    name: 'searchMemory',
    friendlyName: 'Search Memory',
    description: 'Searches through stored memories',
    icon: '🔎',
    category: 'memory'
  },
  
  // MCP tools with mcp_ prefix
  mcp_github_pull_request_review: {
    name: 'mcp_github_pull_request_review',
    friendlyName: 'Review GitHub PR',
    description: 'Reviews a GitHub pull request for code quality',
    icon: '🐙',
    category: 'external'
  },
  
  mcp_github_create_issue_comment: {
    name: 'mcp_github_create_issue_comment',
    friendlyName: 'Comment on GitHub',
    description: 'Posts a comment on a GitHub issue or PR',
    icon: '💬',
    category: 'external'
  },
  
  mcp_github_get_pull_request: {
    name: 'mcp_github_get_pull_request',
    friendlyName: 'Get PR Details',
    description: 'Fetches details about a GitHub pull request',
    icon: '📥',
    category: 'external'
  }
}

// Get friendly display info for a tool
export async function getToolMetadata(toolName: string, toolDefinition?: any): Promise<ToolMetadata> {
  // Check if it's an MCP tool
  if (toolName.startsWith('mcp_')) {
    return await generateMCPToolMetadata(toolName, toolDefinition)
  }
  
  // Return hardcoded metadata or default
  return toolMetadata[toolName] || {
    name: toolName,
    friendlyName: toolName.replace(/([A-Z])/g, ' $1').trim(),
    description: 'Executes a tool operation',
    category: 'external'
  }
}

// Synchronous version for immediate display (uses cache or fallback)
export function getToolMetadataSync(toolName: string): ToolMetadata {
  // For non-MCP tools or cached MCP tools
  if (!toolName.startsWith('mcp_')) {
    return toolMetadata[toolName] || {
      name: toolName,
      friendlyName: toolName.replace(/([A-Z])/g, ' $1').trim(),
      description: 'Executes a tool operation',
      category: 'external'
    }
  }
  
  // For MCP tools, provide a basic fallback
  const withoutPrefix = toolName.replace('mcp_', '')
  const parts = withoutPrefix.split('_')
  
  return {
    name: toolName,
    friendlyName: parts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: `Executes ${withoutPrefix.replace(/_/g, ' ')} operation`,
    icon: '🔧',
    category: 'external'
  }
}

// Format tool arguments for display
export function formatToolArguments(toolName: string, args: any): string {
  // Use MCP formatter for MCP tools
  if (toolName.startsWith('mcp_')) {
    return formatMCPToolArguments(toolName, args)
  }
  
  switch (toolName) {
    case 'createAgent':
      return `Creating ${args.name || 'an agent'}: "${args.specification?.substring(0, 100)}..."`
    
    case 'runDiscussion':
      return `Topic: "${args.topic?.substring(0, 80)}..." (${args.style} style)`
    
    case 'gatherIndependentResponses':
      const agentCount = args.agents?.length || 0
      return `Asking ${agentCount} agents: "${args.prompt?.substring(0, 60)}..."`
    
    case 'mcp_github_pull_request_review':
      return `Reviewing PR: ${args.repo}#${args.pull_number}`
    
    default:
      // Generic formatting
      const keys = Object.keys(args).slice(0, 3)
      return keys.map(k => `${k}: ${JSON.stringify(args[k])?.substring(0, 30)}...`).join(', ')
  }
}

// Format tool results for display
export function formatToolResult(toolName: string, result: any): {
  summary: string
  details?: any
} {
  if (!result) return { summary: 'No result' }
  
  // Use MCP formatter for MCP tools
  if (toolName.startsWith('mcp_')) {
    return formatMCPToolResult(toolName, result)
  }
  
  switch (toolName) {
    case 'createAgent':
      return {
        summary: `Created agent: ${result.name || result.id}`,
        details: {
          id: result.id,
          name: result.name,
          created: result.created
        }
      }
    
    case 'runDiscussion':
      const turns = result.transcript?.length || 0
      return {
        summary: `Discussion completed with ${turns} exchanges`,
        details: {
          participants: result.participants || [],
          turns: turns,
          topic: result.topic
        }
      }
    
    case 'gatherIndependentResponses':
      const responses = result.responses?.length || 0
      return {
        summary: `Gathered ${responses} responses`,
        details: {
          responseCount: responses,
          prompt: result.prompt
        }
      }
    
    case 'mcp_github_create_issue_comment':
      return {
        summary: 'Comment posted successfully',
        details: {
          commentUrl: result.html_url,
          id: result.id
        }
      }
    
    default:
      // Try to extract meaningful summary
      if (typeof result === 'string') {
        return { summary: result.substring(0, 100) + '...' }
      } else if (result.error) {
        return { summary: `Error: ${result.error}` }
      } else if (result.success !== undefined) {
        return { summary: result.success ? 'Completed successfully' : 'Failed' }
      } else {
        return { 
          summary: 'Completed',
          details: result
        }
      }
  }
}