/**
 * Code Generation Tool
 * 
 * This tool allows the LLM to generate code files, fix test failures,
 * and perform other code-related tasks programmatically.
 */

import { promises as fs } from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface CodeGenerationRequest {
  action: 'create' | 'update' | 'fix-test' | 'run-test'
  filePath?: string
  content?: string
  testCommand?: string
  description: string
}

export interface CodeGenerationResponse {
  success: boolean
  message: string
  output?: string
  error?: string
}

export const generateCode = {
  name: 'generateCode',
  description: 'Generate, update, or fix code files. Can also run tests and fix failures.',
  parameters: {
    action: {
      type: 'string',
      enum: ['create', 'update', 'fix-test', 'run-test'],
      description: 'What to do with the code'
    },
    filePath: {
      type: 'string',
      description: 'Path to the file (relative to project root)',
      optional: true
    },
    content: {
      type: 'string', 
      description: 'The code content to write',
      optional: true
    },
    testCommand: {
      type: 'string',
      description: 'Test command to run (e.g., "npm test -- auth.spec.ts")',
      optional: true
    },
    description: {
      type: 'string',
      description: 'What this code does or what problem it solves'
    }
  },
  execute: async (request: CodeGenerationRequest): Promise<CodeGenerationResponse> => {
    try {
      switch (request.action) {
        case 'create':
          return await createFile(request)
        case 'update':
          return await updateFile(request)
        case 'fix-test':
          return await fixTest(request)
        case 'run-test':
          return await runTest(request)
        default:
          return {
            success: false,
            message: 'Unknown action',
            error: `Action ${request.action} not supported`
          }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Code generation failed',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

async function createFile(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
  if (!request.filePath || !request.content) {
    return {
      success: false,
      message: 'Missing required parameters',
      error: 'filePath and content are required for create action'
    }
  }

  const fullPath = path.join(process.cwd(), request.filePath)
  const dir = path.dirname(fullPath)

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true })

  // Check if file already exists
  try {
    await fs.access(fullPath)
    return {
      success: false,
      message: 'File already exists',
      error: `File ${request.filePath} already exists. Use update action instead.`
    }
  } catch {
    // File doesn't exist, good to create
  }

  // Write the file
  await fs.writeFile(fullPath, request.content, 'utf-8')

  return {
    success: true,
    message: `Created ${request.filePath}`,
    output: request.description
  }
}

async function updateFile(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
  if (!request.filePath || !request.content) {
    return {
      success: false,
      message: 'Missing required parameters',
      error: 'filePath and content are required for update action'
    }
  }

  const fullPath = path.join(process.cwd(), request.filePath)

  // Check if file exists
  try {
    await fs.access(fullPath)
  } catch {
    return {
      success: false,
      message: 'File not found',
      error: `File ${request.filePath} does not exist. Use create action instead.`
    }
  }

  // Update the file
  await fs.writeFile(fullPath, request.content, 'utf-8')

  return {
    success: true,
    message: `Updated ${request.filePath}`,
    output: request.description
  }
}

async function runTest(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
  if (!request.testCommand) {
    return {
      success: false,
      message: 'Missing test command',
      error: 'testCommand is required for run-test action'
    }
  }

  try {
    const { stdout, stderr } = await execAsync(request.testCommand, {
      cwd: process.cwd(),
      env: { ...process.env, CI: 'false' }
    })

    return {
      success: true,
      message: 'Test completed successfully',
      output: stdout + (stderr ? `\nWarnings:\n${stderr}` : '')
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Test failed',
      error: error.message,
      output: error.stdout + '\n' + error.stderr
    }
  }
}

async function fixTest(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
  if (!request.testCommand) {
    return {
      success: false,
      message: 'Missing test command',
      error: 'testCommand is required for fix-test action'
    }
  }

  // First, run the test to get the failure
  const testResult = await runTest({ ...request, action: 'run-test' })
  
  if (testResult.success) {
    return {
      success: true,
      message: 'Test is already passing',
      output: testResult.output
    }
  }

  // Analyze the error
  const errorAnalysis = analyzeTestError(testResult.output || '', testResult.error || '')

  return {
    success: false,
    message: 'Test analysis complete',
    output: `Test failed. Analysis:\n${JSON.stringify(errorAnalysis, null, 2)}\n\nTo fix this test, you need to:\n${errorAnalysis.suggestedFixes.join('\n')}`,
    error: testResult.error
  }
}

interface TestErrorAnalysis {
  errorType: string
  failedSelector?: string
  timeout?: boolean
  expectedText?: string
  actualText?: string
  suggestedFixes: string[]
}

function analyzeTestError(stdout: string, stderr: string): TestErrorAnalysis {
  const fullOutput = stdout + '\n' + stderr
  const analysis: TestErrorAnalysis = {
    errorType: 'unknown',
    suggestedFixes: []
  }

  // Check for timeout errors
  if (fullOutput.includes('TimeoutError') || fullOutput.includes('Timeout')) {
    analysis.errorType = 'timeout'
    analysis.timeout = true
    analysis.suggestedFixes.push('Increase timeout values in the test')
    analysis.suggestedFixes.push('Check if the page is actually loading')
    analysis.suggestedFixes.push('Verify the URL patterns are correct')
  }

  // Check for selector errors
  const selectorMatch = fullOutput.match(/locator\(['"]([^'"]+)['"]\)/g)
  if (selectorMatch) {
    analysis.errorType = 'selector'
    analysis.failedSelector = selectorMatch[0]
    analysis.suggestedFixes.push(`Update the selector: ${selectorMatch[0]}`)
    analysis.suggestedFixes.push('Check if the element exists on the page')
    analysis.suggestedFixes.push('Verify the element is visible')
  }

  // Check for text mismatch
  const expectedMatch = fullOutput.match(/Expected: (.+)/g)
  const receivedMatch = fullOutput.match(/Received: (.+)/g)
  if (expectedMatch && receivedMatch) {
    analysis.errorType = 'assertion'
    analysis.expectedText = expectedMatch[0]
    analysis.actualText = receivedMatch[0]
    analysis.suggestedFixes.push('Update the expected text in the assertion')
    analysis.suggestedFixes.push('Check if the UI has changed')
  }

  // Check for navigation errors
  if (fullOutput.includes('waiting for navigation')) {
    analysis.errorType = 'navigation'
    analysis.suggestedFixes.push('Check if the navigation is happening')
    analysis.suggestedFixes.push('Verify the URL pattern in waitForURL')
    analysis.suggestedFixes.push('Add waitUntil: "networkidle" option')
  }

  return analysis
}

// Export tool metadata for registration
export const codeGenerationTool = {
  tool: generateCode,
  category: 'development',
  description: 'Generate and manage code files, run tests, and fix test failures'
}