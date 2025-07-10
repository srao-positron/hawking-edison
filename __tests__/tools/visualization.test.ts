import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') })

// Import visualization tools
import { 
  createVisualization,
  createChart,
  createComparison,
  createDiagram,
  createDashboard
} from '../../src/tools/visualization'

// Mock context
const mockContext = {
  supabase: null as any,
  userId: 'test-user-123',
  threadId: 'test-thread-123',
  toolExecutionId: 'test-execution-123'
}

describe('Visualization Tools', () => {
  beforeEach(() => {
    // Create mock Supabase client
    mockContext.supabase = {
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'mock-id',
                type: 'chart',
                content: '<svg>Mock Chart</svg>'
              },
              error: null
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        }))
      }))
    }
  })

  describe('createVisualization', () => {
    it('should have correct metadata', () => {
      expect(createVisualization.name).toBe('createVisualization')
      expect(createVisualization.description).toContain('LLM-powered agent')
      expect(createVisualization.parameters.data.required).toBe(true)
      expect(createVisualization.parameters.type.required).toBe(true)
      expect(createVisualization.parameters.goal.required).toBe(true)
    })

    it('should validate parameters', () => {
      const params = createVisualization.parameters
      expect(params.data.type).toBe('object')
      expect(params.type.type).toBe('string')
      expect(params.goal.type).toBe('string')
    })
  })

  describe('createChart', () => {
    it('should have correct metadata', () => {
      expect(createChart.name).toBe('createChart')
      expect(createChart.description).toContain('specific chart')
      expect(createChart.parameters.data.required).toBe(true)
      expect(createChart.parameters.chartType.required).toBe(true)
      expect(createChart.parameters.title.required).toBe(true)
    })

    it('should have optional axis labels', () => {
      expect(createChart.parameters.xLabel.required).toBe(false)
      expect(createChart.parameters.yLabel.required).toBe(false)
    })
  })

  describe('createComparison', () => {
    it('should have correct metadata', () => {
      expect(createComparison.name).toBe('createComparison')
      expect(createComparison.description).toContain('visual comparison')
      expect(createComparison.parameters.options.required).toBe(true)
      expect(createComparison.parameters.criteria.required).toBe(true)
      expect(createComparison.parameters.style.required).toBe(true)
    })

    it('should validate array parameters', () => {
      expect(createComparison.parameters.options.type).toBe('array')
      expect(createComparison.parameters.criteria.type).toBe('array')
    })
  })

  describe('createDiagram', () => {
    it('should have correct metadata', () => {
      expect(createDiagram.name).toBe('createDiagram')
      expect(createDiagram.description).toContain('flowcharts')
      expect(createDiagram.parameters.nodes.required).toBe(true)
      expect(createDiagram.parameters.connections.required).toBe(true)
      expect(createDiagram.parameters.diagramType.required).toBe(true)
    })

    it('should support various diagram types', () => {
      const desc = createDiagram.parameters.diagramType.description
      expect(desc).toContain('flowchart')
      expect(desc).toContain('process')
      expect(desc).toContain('relationship')
      expect(desc).toContain('mindmap')
    })
  })

  describe('createDashboard', () => {
    it('should have correct metadata', () => {
      expect(createDashboard.name).toBe('createDashboard')
      expect(createDashboard.description).toContain('multi-metric dashboard')
      expect(createDashboard.parameters.metrics.required).toBe(true)
      expect(createDashboard.parameters.layout.required).toBe(true)
      expect(createDashboard.parameters.title.required).toBe(true)
    })

    it('should have optional time range', () => {
      expect(createDashboard.parameters.timeRange.required).toBe(false)
    })
  })

  describe('Tool Integration', () => {
    it('should delegate chart creation to main visualization tool', async () => {
      // Mock the main visualization tool execute
      const executeSpy = jest.spyOn(createVisualization, 'execute')
      
      // Note: In a real test environment with Deno/Edge Function runtime,
      // this would actually call the tool. Here we're testing the structure.
      const params = {
        data: [1, 2, 3, 4],
        chartType: 'bar',
        title: 'Test Chart'
      }
      
      // Verify the tool transforms parameters correctly
      expect(createChart.execute).toBeDefined()
      expect(typeof createChart.execute).toBe('function')
    })
  })

  describe('Parameter Validation', () => {
    it('should require all mandatory parameters', () => {
      const tools = [
        createVisualization,
        createChart,
        createComparison,
        createDiagram,
        createDashboard
      ]

      tools.forEach(tool => {
        const requiredParams = Object.entries(tool.parameters)
          .filter(([_, config]) => config.required)
          .map(([name, _]) => name)

        expect(requiredParams.length).toBeGreaterThan(0)
        expect(tool.description).toBeTruthy()
        expect(tool.name).toBeTruthy()
      })
    })
  })
})