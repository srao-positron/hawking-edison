// Dynamic MCP tool formatting using Claude Haiku

import { ToolMetadata } from './tool-metadata'

// Cache for generated MCP tool metadata to avoid repeated API calls
const mcpToolCache = new Map<string, ToolMetadata>()

// Generate user-friendly metadata for MCP tools using Claude Haiku
export async function generateMCPToolMetadata(
  toolName: string, 
  toolDefinition?: any
): Promise<ToolMetadata> {
  // Check cache first
  if (mcpToolCache.has(toolName)) {
    return mcpToolCache.get(toolName)!
  }
  
  // For now, use intelligent string parsing
  // In production, this would call Claude Haiku API
  const metadata = await generateMetadataLocally(toolName, toolDefinition)
  
  // Cache the result
  mcpToolCache.set(toolName, metadata)
  return metadata
}

// Local generation (fallback when Haiku is not available)
async function generateMetadataLocally(
  toolName: string,
  toolDefinition?: any
): Promise<ToolMetadata> {
  // Remove mcp_ prefix and extract server name and action
  const withoutPrefix = toolName.replace('mcp_', '')
  const parts = withoutPrefix.split('_')
  
  // Try to identify the service
  const service = parts[0]
  const action = parts.slice(1).join('_')
  
  // Generate friendly name based on common patterns
  let friendlyName = ''
  let description = ''
  let icon = '🔧'
  
  // Service-specific formatting
  switch (service) {
    case 'github':
      icon = '🐙'
      friendlyName = formatGitHubTool(action)
      description = generateGitHubDescription(action, toolDefinition)
      break
      
    case 'slack':
      icon = '💬'
      friendlyName = formatSlackTool(action)
      description = generateSlackDescription(action, toolDefinition)
      break
      
    case 'jira':
      icon = '📋'
      friendlyName = formatJiraTool(action)
      description = generateJiraDescription(action, toolDefinition)
      break
      
    case 'google':
      icon = '🔍'
      friendlyName = formatGoogleTool(action)
      description = generateGoogleDescription(action, toolDefinition)
      break
      
    default:
      // Generic formatting
      friendlyName = parts
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      description = `Executes ${withoutPrefix.replace(/_/g, ' ')} operation`
  }
  
  return {
    name: toolName,
    friendlyName,
    description,
    icon,
    category: 'external'
  }
}

// GitHub-specific formatting
function formatGitHubTool(action: string): string {
  const actionMap: Record<string, string> = {
    'get_pull_request': 'Get PR Details',
    'pull_request_review': 'Review Pull Request',
    'create_issue_comment': 'Post Comment',
    'list_pull_requests': 'List Pull Requests',
    'create_issue': 'Create Issue',
    'get_issue': 'Get Issue Details',
    'update_issue': 'Update Issue',
    'merge_pull_request': 'Merge PR',
    'get_repository': 'Get Repository Info',
    'list_issues': 'List Issues'
  }
  
  return actionMap[action] || `GitHub ${action.replace(/_/g, ' ')}`
}

function generateGitHubDescription(action: string, def?: any): string {
  const descMap: Record<string, string> = {
    'get_pull_request': 'Fetches details about a GitHub pull request',
    'pull_request_review': 'Reviews code changes in a pull request',
    'create_issue_comment': 'Posts a comment on an issue or pull request',
    'list_pull_requests': 'Lists pull requests in a repository',
    'create_issue': 'Creates a new GitHub issue',
    'merge_pull_request': 'Merges a pull request into the base branch'
  }
  
  return descMap[action] || def?.description || `Performs ${action.replace(/_/g, ' ')} on GitHub`
}

// Slack-specific formatting
function formatSlackTool(action: string): string {
  const actionMap: Record<string, string> = {
    'send_message': 'Send Message',
    'get_channel': 'Get Channel Info',
    'list_channels': 'List Channels',
    'upload_file': 'Upload File',
    'get_user': 'Get User Info'
  }
  
  return actionMap[action] || `Slack ${action.replace(/_/g, ' ')}`
}

function generateSlackDescription(action: string, def?: any): string {
  return def?.description || `Performs ${action.replace(/_/g, ' ')} in Slack`
}

// Jira-specific formatting
function formatJiraTool(action: string): string {
  const actionMap: Record<string, string> = {
    'create_issue': 'Create Ticket',
    'update_issue': 'Update Ticket',
    'get_issue': 'Get Ticket Details',
    'transition_issue': 'Change Status',
    'add_comment': 'Add Comment'
  }
  
  return actionMap[action] || `Jira ${action.replace(/_/g, ' ')}`
}

function generateJiraDescription(action: string, def?: any): string {
  return def?.description || `Performs ${action.replace(/_/g, ' ')} in Jira`
}

// Google-specific formatting
function formatGoogleTool(action: string): string {
  const actionMap: Record<string, string> = {
    'search': 'Search Google',
    'calendar_create_event': 'Create Calendar Event',
    'drive_upload': 'Upload to Drive',
    'sheets_read': 'Read Spreadsheet',
    'docs_create': 'Create Document'
  }
  
  return actionMap[action] || `Google ${action.replace(/_/g, ' ')}`
}

function generateGoogleDescription(action: string, def?: any): string {
  return def?.description || `Performs ${action.replace(/_/g, ' ')} using Google services`
}

// Format MCP tool arguments for display
export function formatMCPToolArguments(toolName: string, args: any): string {
  const service = toolName.replace('mcp_', '').split('_')[0]
  
  switch (service) {
    case 'github':
      if (args.repo && args.pull_number) {
        return `PR #${args.pull_number} in ${args.repo}`
      }
      if (args.repo && args.issue_number) {
        return `Issue #${args.issue_number} in ${args.repo}`
      }
      if (args.repo) {
        return `Repository: ${args.repo}`
      }
      break
      
    case 'slack':
      if (args.channel && args.message) {
        return `"${args.message.substring(0, 50)}..." to #${args.channel}`
      }
      if (args.channel) {
        return `Channel: #${args.channel}`
      }
      break
      
    case 'jira':
      if (args.issue_key) {
        return `Ticket: ${args.issue_key}`
      }
      if (args.project && args.summary) {
        return `"${args.summary.substring(0, 50)}..." in ${args.project}`
      }
      break
  }
  
  // Generic formatting
  const keys = Object.keys(args).slice(0, 2)
  return keys.map(k => `${k}: ${JSON.stringify(args[k])?.substring(0, 30)}`).join(', ')
}

// Format MCP tool results for display
export function formatMCPToolResult(toolName: string, result: any): {
  summary: string
  details?: any
} {
  if (!result) return { summary: 'No result' }
  
  const service = toolName.replace('mcp_', '').split('_')[0]
  
  // Handle errors
  if (result.error) {
    return { summary: `Error: ${result.error}` }
  }
  
  // Service-specific formatting
  switch (service) {
    case 'github':
      if (result.html_url) {
        return { 
          summary: 'Operation completed successfully',
          details: { url: result.html_url }
        }
      }
      if (result.title) {
        return {
          summary: result.title,
          details: {
            state: result.state,
            number: result.number,
            created_at: result.created_at
          }
        }
      }
      break
      
    case 'slack':
      if (result.ok) {
        return { summary: 'Message sent successfully' }
      }
      break
      
    case 'jira':
      if (result.key) {
        return {
          summary: `Created ${result.key}`,
          details: { key: result.key, id: result.id }
        }
      }
      break
  }
  
  // Generic result formatting
  if (typeof result === 'string') {
    return { summary: result.substring(0, 100) }
  }
  
  if (result.success !== undefined) {
    return { summary: result.success ? 'Completed successfully' : 'Operation failed' }
  }
  
  return { 
    summary: 'Operation completed',
    details: result
  }
}

// Future enhancement: Call Claude Haiku API
async function callClaudeHaiku(toolName: string, toolDef: any): Promise<{
  friendlyName: string
  description: string
}> {
  // This would make an API call to Claude Haiku
  // For now, we use the local generation
  
  const prompt = `
    Convert this technical tool name and definition into user-friendly text:
    
    Tool name: ${toolName}
    Definition: ${JSON.stringify(toolDef, null, 2)}
    
    Provide:
    1. A short friendly name (2-4 words)
    2. A one-sentence description of what it does
    
    Format as JSON: { "friendlyName": "...", "description": "..." }
  `
  
  // In production: const response = await claudeHaikuAPI.complete(prompt)
  // For now, return a placeholder
  return {
    friendlyName: toolName.replace(/mcp_|_/g, ' ').trim(),
    description: `Executes ${toolName} operation`
  }
}