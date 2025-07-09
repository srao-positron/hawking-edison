/**
 * Tool Registry for Lambda Orchestrator
 * 
 * These are the actual tool implementations that the LLM orchestrator uses.
 * They are designed to be simple, composable, and flexible.
 */

import { createClient } from '@supabase/supabase-js'
import { Tool } from '../llm-client'
import { agentTools } from './agent'
import { interactionTools } from './interaction'
import { analysisTools } from './analysis'
import { memoryTools } from './memory'

export interface ToolExecutionContext {
  supabase: ReturnType<typeof createClient>
  userId: string
  sessionId: string
}

export interface ToolDefinition extends Tool {
  execute: (args: any, context: ToolExecutionContext) => Promise<any>
}

// Registry of all available tools
export const toolRegistry: Map<string, ToolDefinition> = new Map()

// Register all tools
function registerTools(tools: ToolDefinition[]) {
  tools.forEach(tool => {
    toolRegistry.set(tool.name, tool)
  })
}

// Register all tool categories
registerTools([
  ...agentTools,
  ...interactionTools,
  ...analysisTools,
  ...memoryTools
])

// Get tool definitions for LLM
export function getToolDefinitions(): Tool[] {
  return Array.from(toolRegistry.values()).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }))
}

// Execute a tool
export async function executeTool(
  toolName: string,
  args: any,
  context: ToolExecutionContext
): Promise<any> {
  const tool = toolRegistry.get(toolName)
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`)
  }
  
  try {
    return await tool.execute(args, context)
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error)
    throw error
  }
}