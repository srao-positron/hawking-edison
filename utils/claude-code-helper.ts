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
      return true
    } catch {
      console.error('❌ Ollama not found. Please install: https://ollama.ai')
      return false
    }
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
      const prompt = this.buildPrompt(request)
      
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

  private buildPrompt(request: CodeRequest): string {
    switch (request.task) {
      case 'generate':
        return `Generate TypeScript code for the following task. Return ONLY the code, no explanations:

${request.prompt}

${request.context ? `Context:\n${request.context}` : ''}

Code:`

      case 'fix-test':
        return `Fix the following test failure. Return the corrected code:

Error:
${request.error}

Original test file:
${request.context}

Fixed code:`

      case 'refactor':
        return `Refactor the following code to improve it:

${request.context}

Requirements:
${request.prompt}

Refactored code:`

      case 'complete':
        return `Complete the following code:

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
    const prompts: Record<string, string> = {
      'edge-function': `Create a Supabase Edge Function named "${name}" with:
- TypeScript
- Proper error handling
- Authentication check
- CORS headers
- Request/response typing`,
      
      'react-component': `Create a React component named "${name}" with:
- TypeScript
- Proper props interface
- Clean styling with Tailwind
- Loading and error states`,
      
      'test': `Create a Jest/Playwright test for "${name}" with:
- Proper test structure
- Mock data setup
- Assertions
- Cleanup`,
      
      'api-endpoint': `Create an API endpoint for "${name}" with:
- Next.js App Router
- TypeScript
- Authentication
- Error handling
- Proper response format`
    }

    const prompt = prompts[type] || `Generate ${type} code for ${name}`

    return this.generateCode({
      task: 'generate',
      prompt
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

Examples:
  npx tsx utils/claude-code-helper.ts check
  npx tsx utils/claude-code-helper.ts generate edge-function processPayment
  npx tsx utils/claude-code-helper.ts fix-test "e2e/auth.spec.ts" "TimeoutError"
  npx tsx utils/claude-code-helper.ts custom "Create a utility to parse CSV files"
  npx tsx utils/claude-code-helper.ts model deepseek-coder:6.7b
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