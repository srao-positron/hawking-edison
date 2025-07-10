/**
 * Visualization Tools for Hawking Edison
 * 
 * These tools allow the LLM orchestrator to create data visualizations
 * using specialized LLM agents that generate SVG charts, diagrams, and dashboards.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { OpenAI } from 'https://esm.sh/openai@4.28.0'

interface VisualizationContext {
  supabase: any
  userId: string
  threadId: string
  toolExecutionId?: string
}

// Main visualization tool that creates a visualization agent
export const createVisualization = {
  name: 'createVisualization',
  description: 'Create a data visualization using an LLM-powered agent that generates SVG or Markdown',
  parameters: {
    data: { 
      type: 'object', 
      description: 'Data to visualize',
      required: true
    },
    type: { 
      type: 'string', 
      description: 'Type of visualization: chart, diagram, dashboard, graph, table',
      required: true
    },
    goal: { 
      type: 'string', 
      description: 'What insights or story to communicate',
      required: true
    }
  },
  execute: async ({ data, type, goal }: any, context: VisualizationContext) => {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')!,
    })

    // Create a specialized visualization agent
    const vizAgent = {
      id: `viz_agent_${Date.now()}`,
      specification: `You are a data visualization expert. Create ${type} visualizations using SVG or Markdown that clearly communicate insights. Focus on clarity, aesthetics, and data accuracy.`
    }
    
    // Create sub-thread for this visualization
    const { data: agentThread } = await context.supabase
      .from('threads')
      .insert({
        user_id: context.userId,
        parent_thread_id: context.threadId,
        name: `Visualization: ${type}`,
        auto_generated_name: `Creating ${type} for ${goal.substring(0, 50)}...`
      })
      .select()
      .single()
    
    // Record agent conversation
    const { data: conversation } = await context.supabase
      .from('agent_conversations')
      .insert({
        parent_thread_id: context.threadId,
        tool_execution_id: context.toolExecutionId,
        agent_specification: vizAgent.specification,
        messages: []
      })
      .select()
      .single()
    
    // Generate visualization using LLM
    const vizPrompt = buildVisualizationPrompt(data, type, goal)
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: vizAgent.specification
        },
        {
          role: 'user',
          content: vizPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
    
    const vizContent = completion.choices[0]?.message?.content || ''
    
    // Store the visualization
    const { data: viz } = await context.supabase
      .from('visualizations')
      .insert({ 
        thread_id: agentThread.id,
        tool_execution_id: context.toolExecutionId,
        type, 
        content: vizContent,
        generation_prompt: goal,
        metadata: { 
          data: data, 
          agent: vizAgent,
          model: 'gpt-4-turbo-preview'
        }
      })
      .select()
      .single()
    
    // Update agent conversation
    await context.supabase
      .from('agent_conversations')
      .update({
        messages: [
          { role: 'system', content: vizAgent.specification },
          { role: 'user', content: vizPrompt },
          { role: 'assistant', content: vizContent }
        ]
      })
      .eq('id', conversation.id)
    
    return {
      id: viz.id,
      type: viz.type,
      threadId: agentThread.id,
      preview: extractPreview(vizContent),
      success: true
    }
  }
}

// Specialized chart creation tool
export const createChart = {
  name: 'createChart',
  description: 'Create a specific chart (bar, line, pie, scatter, etc) with proper styling',
  parameters: {
    data: { 
      type: 'array', 
      description: 'Array of data points',
      required: true
    },
    chartType: { 
      type: 'string', 
      description: 'Type of chart: bar, line, pie, scatter, area, heatmap',
      required: true
    },
    title: { 
      type: 'string', 
      description: 'Chart title',
      required: true
    },
    xLabel: {
      type: 'string',
      description: 'X-axis label',
      required: false
    },
    yLabel: {
      type: 'string',
      description: 'Y-axis label',
      required: false
    }
  },
  execute: async (params: any, context: VisualizationContext) => {
    return createVisualization.execute({
      data: {
        points: params.data,
        xLabel: params.xLabel,
        yLabel: params.yLabel
      },
      type: `${params.chartType} chart`,
      goal: `Create a ${params.chartType} chart titled "${params.title}" that clearly shows the data trends and patterns`
    }, context)
  }
}

// Tool for creating comparison visualizations
export const createComparison = {
  name: 'createComparison',
  description: 'Create a visual comparison between multiple options or entities',
  parameters: {
    options: { 
      type: 'array', 
      description: 'Array of things to compare',
      required: true
    },
    criteria: { 
      type: 'array', 
      description: 'Comparison criteria or dimensions',
      required: true
    },
    style: { 
      type: 'string', 
      description: 'Comparison style: table, matrix, radar, parallel',
      required: true
    },
    title: {
      type: 'string',
      description: 'Comparison title',
      required: true
    }
  },
  execute: async (params: any, context: VisualizationContext) => {
    return createVisualization.execute({
      data: { 
        options: params.options, 
        criteria: params.criteria,
        title: params.title
      },
      type: `${params.style} comparison`,
      goal: `Compare ${params.options.length} options across ${params.criteria.length} criteria to help make an informed decision`
    }, context)
  }
}

// Tool for creating flowcharts and diagrams
export const createDiagram = {
  name: 'createDiagram',
  description: 'Create flowcharts, process diagrams, or relationship diagrams',
  parameters: {
    nodes: {
      type: 'array',
      description: 'Array of nodes/entities in the diagram',
      required: true
    },
    connections: {
      type: 'array',
      description: 'Array of connections between nodes',
      required: true
    },
    diagramType: {
      type: 'string',
      description: 'Type: flowchart, process, relationship, mindmap, hierarchy',
      required: true
    },
    title: {
      type: 'string',
      description: 'Diagram title',
      required: true
    }
  },
  execute: async (params: any, context: VisualizationContext) => {
    return createVisualization.execute({
      data: {
        nodes: params.nodes,
        connections: params.connections,
        title: params.title
      },
      type: `${params.diagramType} diagram`,
      goal: `Create a clear ${params.diagramType} showing the relationships and flow between elements`
    }, context)
  }
}

// Tool for creating dashboards
export const createDashboard = {
  name: 'createDashboard',
  description: 'Create a multi-metric dashboard with various visualizations',
  parameters: {
    metrics: {
      type: 'array',
      description: 'Array of metrics to display',
      required: true
    },
    layout: {
      type: 'string',
      description: 'Dashboard layout: grid, vertical, horizontal, custom',
      required: true
    },
    title: {
      type: 'string',
      description: 'Dashboard title',
      required: true
    },
    timeRange: {
      type: 'string',
      description: 'Time range for data (if applicable)',
      required: false
    }
  },
  execute: async (params: any, context: VisualizationContext) => {
    return createVisualization.execute({
      data: {
        metrics: params.metrics,
        layout: params.layout,
        timeRange: params.timeRange
      },
      type: 'dashboard',
      goal: `Create a comprehensive dashboard titled "${params.title}" that provides an at-a-glance view of all key metrics`
    }, context)
  }
}

// Helper function to build visualization prompt
function buildVisualizationPrompt(data: any, type: string, goal: string): string {
  return `Create a ${type} visualization with the following requirements:

Goal: ${goal}

Data:
${JSON.stringify(data, null, 2)}

Requirements:
1. Use SVG for charts and diagrams (responsive, clean design)
2. Use Markdown tables for tabular data
3. Include proper labels, titles, and legends
4. Use a professional color palette
5. Ensure accessibility (proper contrast, labels)
6. Make it self-explanatory - viewers should understand without additional context

Output only the SVG or Markdown code, no explanations.`
}

// Helper function to extract preview from visualization
function extractPreview(content: string): string {
  // Extract title or first meaningful text
  const titleMatch = content.match(/<title>(.*?)<\/title>/i) || 
                     content.match(/<text.*?>(.*?)<\/text>/i) ||
                     content.match(/^#\s+(.+)$/m)
  
  if (titleMatch) {
    return titleMatch[1]
  }
  
  // Fallback to content type
  if (content.includes('<svg')) {
    return 'SVG visualization generated'
  } else if (content.includes('|')) {
    return 'Table visualization generated'
  }
  
  return 'Visualization generated successfully'
}

// Export all tools
export const visualizationTools = [
  createVisualization,
  createChart,
  createComparison,
  createDiagram,
  createDashboard
]