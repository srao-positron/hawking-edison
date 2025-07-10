/**
 * Visualization Tools for Hawking Edison (Browser/Node version)
 * 
 * These tools allow the LLM orchestrator to create data visualizations
 * using specialized LLM agents that generate SVG charts, diagrams, and dashboards.
 */

export interface VisualizationContext {
  supabase: any
  userId: string
  threadId: string
  toolExecutionId?: string
}

// Tool parameter definitions
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
  }
}

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
  }
}

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
  }
}

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
  }
}

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
  }
}

// Export all tools
export const visualizationTools = [
  createVisualization,
  createChart,
  createComparison,
  createDiagram,
  createDashboard
]

// Helper function to build visualization prompt
export function buildVisualizationPrompt(data: any, type: string, goal: string): string {
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
export function extractPreview(content: string): string {
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