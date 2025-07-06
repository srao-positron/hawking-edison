#!/usr/bin/env node
/**
 * Script to manage Vercel environment variables via API
 */

import * as dotenv from 'dotenv'
import { execSync } from 'child_process'

// Load environment variables
dotenv.config({ path: '.env.local' })

const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const TEAM_ID = 'team_ZEuYsR2MIugF2AV3vr4TR43L'
const PROJECT_ID = 'prj_nqxD4vXzKqP8aZ9kR7mT' // You'll need to get this from Vercel

interface EnvVar {
  key: string
  value: string
  target: ('production' | 'preview' | 'development')[]
  type?: 'plain' | 'secret' | 'sensitive'
}

async function getProjectId(): Promise<string> {
  try {
    // Try to get project ID from vercel.json or API
    const response = await fetch(`https://api.vercel.com/v9/projects?teamId=${TEAM_ID}`, {
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
    })
    
    const data = await response.json()
    const project = data.projects?.find((p: any) => p.name === 'hawking-edison')
    
    if (project) {
      console.log('Found project ID:', project.id)
      return project.id
    }
    
    throw new Error('Project not found')
  } catch (error) {
    console.error('Failed to get project ID:', error)
    // Return a placeholder - you'll need to update this
    return 'YOUR_PROJECT_ID'
  }
}

async function setEnvVar(projectId: string, envVar: EnvVar) {
  const response = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${TEAM_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: envVar.key,
        value: envVar.value,
        target: envVar.target,
        type: envVar.type || 'plain',
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to set ${envVar.key}: ${error}`)
  }

  return response.json()
}

async function updateEnvVars() {
  console.log('🔧 Updating Vercel environment variables...')
  
  const projectId = await getProjectId()
  
  // AWS environment variables for Lambda integration
  const awsVars: EnvVar[] = [
    {
      key: 'AWS_REGION',
      value: 'us-east-1',
      target: ['production', 'preview'],
    },
    {
      key: 'AWS_ACCESS_KEY_ID',
      value: process.env.AWS_ACCESS_KEY_ID || 'PLACEHOLDER',
      target: ['production'],
      type: 'secret',
    },
    {
      key: 'AWS_SECRET_ACCESS_KEY',
      value: process.env.AWS_SECRET_ACCESS_KEY || 'PLACEHOLDER',
      target: ['production'],
      type: 'secret',
    },
    {
      key: 'SNS_TOPIC_ARN',
      value: process.env.SNS_TOPIC_ARN || 'PLACEHOLDER',
      target: ['production', 'preview'],
    },
  ]

  for (const envVar of awsVars) {
    try {
      console.log(`Setting ${envVar.key}...`)
      await setEnvVar(projectId, envVar)
      console.log(`✅ Set ${envVar.key}`)
    } catch (error) {
      console.error(`❌ Failed to set ${envVar.key}:`, error)
    }
  }

  console.log('\n✅ Environment variables updated!')
  console.log('\nNote: You may need to redeploy for changes to take effect.')
}

// Add command to get current env vars
async function listEnvVars() {
  const projectId = await getProjectId()
  
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${TEAM_ID}`,
    {
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to list environment variables')
  }

  const data = await response.json()
  console.log('Current environment variables:')
  data.envs.forEach((env: any) => {
    console.log(`- ${env.key} (${env.target.join(', ')})`)
  })
}

// Parse command line arguments
const command = process.argv[2]

switch (command) {
  case 'list':
    listEnvVars().catch(console.error)
    break
  case 'update':
    updateEnvVars().catch(console.error)
    break
  default:
    console.log('Usage: npx tsx utils/manage-vercel-env.ts [list|update]')
    break
}

export { setEnvVar, getProjectId }