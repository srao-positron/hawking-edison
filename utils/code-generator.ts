#!/usr/bin/env node
/**
 * Code generation tool using local LLM with project context
 * Ensures all generated code follows Hawking Edison standards
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import * as readline from 'readline'

// Load project context
const contextPath = join(__dirname, '../LOCAL_LLM_CONTEXT.md')
const context = readFileSync(contextPath, 'utf-8')

// Additional dynamic context based on current state
function getDynamicContext(): string {
  const additions = []
  
  // Check if we have API key table
  if (existsSync(join(__dirname, '../supabase/migrations/20240108_api_keys.sql'))) {
    additions.push('NOTE: API keys table already exists in the database.')
  }
  
  // Check current authentication setup
  if (existsSync(join(__dirname, '../src/lib/auth-unified.ts'))) {
    additions.push('NOTE: Unified authentication middleware already exists at src/lib/auth-unified.ts')
  }
  
  return additions.length > 0 ? '\n\n## Current Project State\n' + additions.join('\n') : ''
}

interface GenerationRequest {
  task: string
  outputFile?: string
  context?: string
  examples?: string[]
}

async function generateCode(request: GenerationRequest): Promise<string> {
  const { task, context: additionalContext = '', examples = [] } = request
  
  // Build the full prompt
  const prompt = `
${context}
${getDynamicContext()}
${additionalContext ? `\n## Additional Context\n${additionalContext}` : ''}
${examples.length > 0 ? `\n## Examples\n${examples.join('\n\n')}` : ''}

## Task
${task}

Generate ONLY the code requested. Do not include explanations, comments, or markdown code blocks.
Follow ALL the rules and patterns specified above EXACTLY.
`

  try {
    // Call Ollama with the prompt
    const response = execSync(
      `echo '${prompt.replace(/'/g, "'\\''")}' | ollama run codellama:70b --nowordwrap`,
      { 
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      }
    )
    
    // Clean up the response
    let code = response.trim()
    
    // Remove markdown code blocks if present
    code = code.replace(/^```[\w]*\n/, '').replace(/\n```$/, '')
    
    // Save to file if requested
    if (request.outputFile) {
      writeFileSync(request.outputFile, code)
      console.log(`✅ Code generated and saved to: ${request.outputFile}`)
    }
    
    return code
  } catch (error) {
    console.error('❌ Code generation failed:', error)
    throw error
  }
}

// Interactive mode
async function interactive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  console.log('🤖 Hawking Edison Code Generator')
  console.log('This tool ensures all generated code follows project standards.\n')
  
  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve)
    })
  }
  
  while (true) {
    const task = await question('\n📝 What code should I generate? (or "exit" to quit)\n> ')
    
    if (task.toLowerCase() === 'exit') {
      break
    }
    
    const outputFile = await question('💾 Output file path (leave empty to print to console): ')
    
    console.log('\n⏳ Generating code...\n')
    
    try {
      const code = await generateCode({ task, outputFile: outputFile || undefined })
      
      if (!outputFile) {
        console.log('Generated code:\n')
        console.log('---')
        console.log(code)
        console.log('---')
      }
    } catch (error) {
      console.error('Generation failed:', error)
    }
  }
  
  rl.close()
}

// CLI mode
async function cli() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    return interactive()
  }
  
  const task = args[0]
  const outputFile = args[1]
  
  try {
    const code = await generateCode({ task, outputFile })
    
    if (!outputFile) {
      console.log(code)
    }
  } catch (error) {
    process.exit(1)
  }
}

// Export for use as a module
export { generateCode }

// Run if called directly
if (require.main === module) {
  cli().catch(console.error)
}