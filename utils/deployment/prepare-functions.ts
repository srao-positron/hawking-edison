#!/usr/bin/env tsx
// Prepare Edge Functions for manual deployment by combining shared code

import { config } from 'dotenv'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

// Load environment variables
config({ path: join(process.cwd(), '.env.local') })

const FUNCTIONS = ['interact', 'databank', 'memories', 'auth-api-keys']
const SHARED_FILES = ['auth.ts', 'llm.ts', 'logger.ts', 'response.ts']

function prepareFunction(functionName: string) {
  console.log(`\n📦 Preparing ${functionName}...`)
  
  // Read main file
  let mainFile = readFileSync(
    join(process.cwd(), `supabase/functions/${functionName}/index.ts`),
    'utf-8'
  )
  
  // Find all shared imports
  const sharedImports: string[] = []
  const importRegex = /import\s+{([^}]+)}\s+from\s+['"]\.\.?\/_shared\/([^'"]+)['"]/g
  let match
  
  while ((match = importRegex.exec(mainFile)) !== null) {
    sharedImports.push(match[2])
  }
  
  // Build combined file
  let combinedFile = '// Combined Edge Function with shared utilities\n'
  combinedFile += '// Deploy this entire file to Supabase Edge Functions\n\n'
  
  // Add shared files content
  for (const sharedFile of SHARED_FILES) {
    const fileName = sharedFile.replace('.ts', '')
    if (sharedImports.includes(fileName)) {
      console.log(`   Including shared/${fileName}`)
      const content = readFileSync(
        join(process.cwd(), `supabase/functions/_shared/${sharedFile}`),
        'utf-8'
      )
      
      // Remove export keywords for inlining
      const inlinedContent = content
        .replace(/export\s+interface/g, 'interface')
        .replace(/export\s+enum/g, 'enum')
        .replace(/export\s+class/g, 'class')
        .replace(/export\s+function/g, 'function')
        .replace(/export\s+const/g, 'const')
        .replace(/export\s+{[^}]+}/g, '')
      
      combinedFile += `// ===== From _shared/${sharedFile} =====\n`
      combinedFile += inlinedContent + '\n\n'
    }
  }
  
  // Remove shared imports from main file
  mainFile = mainFile.replace(/import\s+{[^}]+}\s+from\s+['"]\.\.?\/_shared\/[^'"]+['"]\n?/g, '')
  
  // Add main file content
  combinedFile += '// ===== Main function =====\n'
  combinedFile += mainFile
  
  // Create output directory
  const outputDir = join(process.cwd(), 'supabase/functions/_deploy')
  mkdirSync(outputDir, { recursive: true })
  
  // Write combined file
  const outputPath = join(outputDir, `${functionName}.ts`)
  writeFileSync(outputPath, combinedFile)
  
  console.log(`   ✅ Combined file created at: supabase/functions/_deploy/${functionName}.ts`)
}

function prepareAll() {
  console.log('🚀 Preparing Edge Functions for deployment...\n')
  console.log('This will create combined files with all dependencies included.')
  console.log('You can copy these files directly to Supabase Edge Functions.\n')
  
  for (const func of FUNCTIONS) {
    prepareFunction(func)
  }
  
  console.log('\n✅ All functions prepared!')
  console.log('\n📋 Deployment instructions:')
  console.log('\n1. Go to: https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/functions')
  console.log('2. For each function:')
  console.log('   - Click "New function"')
  console.log('   - Set the name (interact, databank, memories, or auth-api-keys)')
  console.log('   - Copy the entire content from: supabase/functions/_deploy/[function-name].ts')
  console.log('   - Enable "Verify JWT"')
  console.log('   - Add environment variables: ANTHROPIC_API_KEY and OPENAI_API_KEY')
  console.log('   - Deploy\n')
}

prepareAll()