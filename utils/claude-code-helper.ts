#!/usr/bin/env tsx
/**
 * Claude Code Helper - Local code generation using Ollama/CodeLlama
 * 
 * This tool helps Claude Code generate code locally using CodeLlama,
 * saving Opus tokens for higher-level architecture and design tasks.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import * as path from 'path'
import { glob } from 'glob'

const execAsync = promisify(exec)

interface CodeRequest {
  task: 'generate' | 'fix-test' | 'refactor' | 'complete'
  context?: string
  filePath?: string
  error?: string
  prompt: string
}

interface CodeResponse {
  success: boolean
  code?: string
  explanation?: string
  error?: string
}

class ClaudeCodeHelper {
  private ollamaModel = 'deepseek-coder:6.7b' // Use DeepSeek as default
  private projectRoot = path.resolve(__dirname, '..')
  private developmentRules: string = ''
  private projectContext: string = ''
  
  async checkOllama(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('ollama list')
      const hasDeepSeek = stdout.includes('deepseek-coder')
      const hasCodeLlama = stdout.includes('codellama')
      
      if (hasDeepSeek) {
        console.log('✅ Using DeepSeek Coder')
        this.ollamaModel = 'deepseek-coder:6.7b'
      } else if (hasCodeLlama) {
        console.log('✅ Using CodeLlama')
        this.ollamaModel = 'codellama:70b'
      } else {
        console.error('❌ No supported model found. Install deepseek-coder or codellama')
        return false
      }
      
      // Load development rules and project context
      await this.loadProjectContext()
      
      return true
    } catch {
      console.error('❌ Ollama not found. Please install: https://ollama.ai')
      return false
    }
  }

  async loadProjectContext() {
    try {
      // Load development rules
      const rulesPath = path.join(this.projectRoot, 'DEVELOPMENT_RULES.md')
      if (await this.fileExists(rulesPath)) {
        this.developmentRules = await fs.readFile(rulesPath, 'utf-8')
      }
      
      // Load CLAUDE.md for project context
      const claudePath = path.join(this.projectRoot, 'CLAUDE.md')
      if (await this.fileExists(claudePath)) {
        const claudeContent = await fs.readFile(claudePath, 'utf-8')
        // Extract key sections
        this.projectContext = this.extractKeyContext(claudeContent)
      }
      
      console.log('📚 Loaded project context and development rules')
    } catch (error) {
      console.warn('⚠️  Could not load all project context:', error)
    }
  }

  private extractKeyContext(content: string): string {
    // Extract key sections from CLAUDE.md
    const sections = [
      'Project Overview',
      'Core Architecture', 
      'File Structure',
      'Key Principles',
      'Database Schema',
      'Common Patterns'
    ]
    
    let extracted = ''
    for (const section of sections) {
      const regex = new RegExp(`### ${section}([\\s\\S]*?)(?=###|$)`, 'i')
      const match = content.match(regex)
      if (match) {
        extracted += `\n${section}:\n${match[1].trim()}\n`
      }
    }
    
    return extracted
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  async findSimilarCode(type: string, name?: string): Promise<string> {
    try {
      const patterns: Record<string, string> = {
        'edge-function': 'supabase/functions/*/index.ts',
        'react-component': 'src/components/**/*.tsx',
        'test': 'e2e/**/*.spec.ts',
        'api-endpoint': 'src/app/api/**/*.ts',
        'hook': 'src/hooks/**/*.ts',
        'util': 'src/lib/**/*.ts'
      }
      
      const pattern = patterns[type]
      if (!pattern) return ''
      
      const files = await glob(pattern, { cwd: this.projectRoot })
      if (files.length === 0) return ''
      
      // Read a sample file to understand patterns
      const sampleFile = files[0]
      const content = await fs.readFile(path.join(this.projectRoot, sampleFile), 'utf-8')
      
      return `Example from ${sampleFile}:\n\`\`\`typescript\n${content.slice(0, 1000)}\n\`\`\``
    } catch {
      return ''
    }
  }

  async getRelevantRules(task: string): string {
    if (!this.developmentRules) return ''
    
    // Extract relevant rules based on task
    const rulePatterns: Record<string, string[]> = {
      'edge-function': ['API-First', 'Authentication Always', 'Consistent API Responses'],
      'react-component': ['API-First', 'No Types, No Templates'],
      'test': ['Test-First Development', 'Update Tests When UI Changes'],
      'api-endpoint': ['API-First', 'Authentication Always', 'Consistent API Responses']
    }
    
    const relevantPatterns = rulePatterns[task] || ['API-First']
    let extractedRules = ''
    
    for (const pattern of relevantPatterns) {
      const regex = new RegExp(`## Rule \\d+: ${pattern}[\\s\\S]*?(?=## Rule|$)`, 'i')
      const match = this.developmentRules.match(regex)
      if (match) {
        extractedRules += match[0] + '\n\n'
      }
    }
    
    return extractedRules
  }

  async generateCode(request: CodeRequest): Promise<CodeResponse> {
    const ready = await this.checkOllama()
    if (!ready) {
      return {
        success: false,
        error: 'Ollama/CodeLlama not available'
      }
    }

    try {
      const prompt = await this.buildPrompt(request)
      
      // Call Ollama with timeout handling for long operations
      console.log('🔄 Generating code... This may take a few minutes.')
      
      const { stdout, stderr } = await execAsync(
        `echo '${prompt.replace(/'/g, "'\\''")}' | ollama run ${this.ollamaModel}`,
        { 
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer for larger outputs
          timeout: 5 * 60 * 1000 // 5 minute timeout
        }
      )

      // Extract code from response
      const code = this.extractCode(stdout)
      
      return {
        success: true,
        code,
        explanation: this.extractExplanation(stdout)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async buildPrompt(request: CodeRequest): Promise<string> {
    // Get similar code examples
    const similarCode = await this.findSimilarCode(request.task === 'generate' ? request.prompt.split(' ')[0] : 'general')
    
    // Get relevant development rules
    const relevantRules = await this.getRelevantRules(request.task === 'generate' ? request.prompt.split(' ')[0] : 'general')
    
    // Build enhanced prompt with context
    const contextSection = `
# Project Context

This is for the Hawking Edison v2 project - a tool-based LLM orchestration platform.

${this.projectContext}

# Development Rules

${relevantRules}

# Code Examples from Project

${similarCode}

# Important Requirements
- Follow the exact patterns used in this codebase
- Use TypeScript with proper types
- Include error handling
- Follow our API-first architecture
- No business logic in browser code
- Authentication is required for all endpoints
`

    switch (request.task) {
      case 'generate':
        return `Generate TypeScript code for the following task. Return ONLY the code, no explanations:

${contextSection}

# Task
${request.prompt}

${request.context ? `Additional Context:\n${request.context}` : ''}

Code:`

      case 'fix-test':
        return `Fix the following test failure. Return the corrected code:

${contextSection}

Error:
${request.error}

Original test file:
${request.context}

# Test Requirements
- Use proper Playwright selectors
- Include appropriate waits
- Follow our test patterns
- Update selectors to match current UI

Fixed code:`

      case 'refactor':
        return `Refactor the following code to improve it:

${contextSection}

Original code:
${request.context}

Requirements:
${request.prompt}

Refactored code:`

      case 'complete':
        return `Complete the following code:

${contextSection}

Partial code:
${request.context}

${request.prompt}

Completed code:`

      default:
        return request.prompt
    }
  }

  private extractCode(response: string): string {
    // Try to extract code blocks
    const codeBlockMatch = response.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/g)
    if (codeBlockMatch) {
      return codeBlockMatch
        .map(block => block.replace(/```(?:typescript|ts|javascript|js)?\n/, '').replace(/```$/, ''))
        .join('\n\n')
    }

    // If no code blocks, assume entire response is code
    return response.trim()
  }

  private extractExplanation(response: string): string {
    // Extract non-code portions as explanation
    const withoutCode = response.replace(/```[\s\S]*?```/g, '').trim()
    return withoutCode || 'Code generated successfully'
  }

  async fixTest(testPath: string, error: string): Promise<CodeResponse> {
    try {
      const testContent = await fs.readFile(testPath, 'utf-8')
      
      const result = await this.generateCode({
        task: 'fix-test',
        context: testContent,
        error,
        prompt: 'Fix this test to make it pass',
        filePath: testPath
      })

      if (result.success && result.code) {
        // Write the fixed test
        await fs.writeFile(testPath, result.code, 'utf-8')
        console.log(`✅ Fixed test: ${testPath}`)
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: `Failed to fix test: ${error}`
      }
    }
  }

  async generateBoilerplate(type: string, name: string): Promise<CodeResponse> {
    // Read existing file for better context
    const similarCode = await this.findSimilarCode(type, name)
    
    const prompts: Record<string, string> = {
      'edge-function': `Create a Supabase Edge Function named "${name}" with:
- TypeScript with Deno
- Dual authentication (session + API key)
- Proper error handling with ErrorCodes
- CORS headers matching our pattern
- Consistent API response format
- Follow our Edge Function patterns exactly`,
      
      'react-component': `Create a React component named "${name}" with:
- TypeScript with proper interfaces
- No business logic (API-first)
- Tailwind CSS styling
- Loading and error states
- Use our API client for data
- Follow our component patterns`,
      
      'test': `Create a Playwright test for "${name}" with:
- Proper test structure
- Use dedicated test user
- hawkingedison.com email domain
- Proper selectors and waits
- Follow our test patterns
- Clean up after test`,
      
      'api-endpoint': `Create an API endpoint for "${name}" with:
- Next.js App Router
- TypeScript interfaces
- Dual authentication support
- Consistent error handling
- Standard API response format
- Follow our endpoint patterns`
    }

    const prompt = prompts[type] || `Generate ${type} code for ${name}`

    return this.generateCode({
      task: 'generate',
      prompt,
      context: similarCode
    })
  }

  // Add method to read file with context
  async readFileWithContext(filePath: string): Promise<string> {
    try {
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.projectRoot, filePath)
      
      const content = await fs.readFile(absolutePath, 'utf-8')
      const fileType = path.extname(filePath).slice(1)
      
      return `File: ${filePath}\nType: ${fileType}\n\n\`\`\`${fileType}\n${content}\n\`\`\``
    } catch (error) {
      return `Error reading file ${filePath}: ${error}`
    }
  }

  // Enhanced custom generation with file context
  async generateWithFiles(prompt: string, filePaths: string[]): Promise<CodeResponse> {
    let fileContexts = ''
    
    for (const filePath of filePaths) {
      const context = await this.readFileWithContext(filePath)
      fileContexts += `\n\n${context}`
    }
    
    return this.generateCode({
      task: 'generate',
      prompt,
      context: fileContexts
    })
  }
}

// CLI interface
async function main() {
  const helper = new ClaudeCodeHelper()
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log(`
Claude Code Helper - Local code generation with DeepSeek/CodeLlama

Usage:
  npx tsx utils/claude-code-helper.ts <command> [options]

Commands:
  check                     Check if Ollama models are available
  generate <type> <name>    Generate boilerplate code
  fix-test <path> <error>   Fix a failing test
  custom <prompt>           Generate code from custom prompt
  model <name>              Switch between models (deepseek-coder:6.7b or codellama:70b)
  with-files <prompt> <file1> [file2...]  Generate with file context

Examples:
  npx tsx utils/claude-code-helper.ts check
  npx tsx utils/claude-code-helper.ts generate edge-function processPayment
  npx tsx utils/claude-code-helper.ts fix-test "e2e/auth.spec.ts" "TimeoutError"
  npx tsx utils/claude-code-helper.ts custom "Create a utility to parse CSV files"
  npx tsx utils/claude-code-helper.ts model deepseek-coder:6.7b
  npx tsx utils/claude-code-helper.ts with-files "Add error handling" src/lib/api.ts
`)
    return
  }

  const [command, ...commandArgs] = args

  switch (command) {
    case 'check':
      const ready = await helper.checkOllama()
      break
      
    case 'model':
      if (commandArgs.length < 1) {
        console.error('Usage: model <name>')
        process.exit(1)
      }
      helper.ollamaModel = commandArgs[0]
      console.log(`✅ Switched to model: ${commandArgs[0]}`)
      break

    case 'generate':
      if (commandArgs.length < 2) {
        console.error('Usage: generate <type> <name>')
        process.exit(1)
      }
      const genResult = await helper.generateBoilerplate(commandArgs[0], commandArgs[1])
      if (genResult.success) {
        console.log(genResult.code)
      } else {
        console.error('Generation failed:', genResult.error)
      }
      break

    case 'fix-test':
      if (commandArgs.length < 2) {
        console.error('Usage: fix-test <path> <error>')
        process.exit(1)
      }
      const fixResult = await helper.fixTest(commandArgs[0], commandArgs.slice(1).join(' '))
      if (!fixResult.success) {
        console.error('Fix failed:', fixResult.error)
      }
      break

    case 'custom':
      if (commandArgs.length === 0) {
        console.error('Usage: custom <prompt>')
        process.exit(1)
      }
      const customResult = await helper.generateCode({
        task: 'generate',
        prompt: commandArgs.join(' ')
      })
      if (customResult.success) {
        console.log(customResult.code)
      } else {
        console.error('Generation failed:', customResult.error)
      }
      break

    case 'with-files':
      if (commandArgs.length < 2) {
        console.error('Usage: with-files <prompt> <file1> [file2...]')
        process.exit(1)
      }
      const [withFilesPrompt, ...files] = commandArgs
      const withFilesResult = await helper.generateWithFiles(withFilesPrompt, files)
      if (withFilesResult.success) {
        console.log(withFilesResult.code)
      } else {
        console.error('Generation failed:', withFilesResult.error)
      }
      break

    default:
      console.error(`Unknown command: ${command}`)
      process.exit(1)
  }
}

// Export for use in other scripts
export { ClaudeCodeHelper, CodeRequest, CodeResponse }

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}