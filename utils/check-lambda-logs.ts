#!/usr/bin/env tsx
/**
 * Check AWS Lambda logs for orchestrator
 */

import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const client = new CloudWatchLogsClient({ 
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
})

async function checkLambdaLogs(functionName: string = 'hawking-edison-dev-orchestrator', minutes: number = 10) {
  try {
    const endTime = Date.now()
    const startTime = endTime - (minutes * 60 * 1000)
    
    console.log(`\n=== Lambda Logs for ${functionName} ===`)
    console.log(`Last ${minutes} minutes\n`)
    
    const command = new FilterLogEventsCommand({
      logGroupName: `/aws/lambda/${functionName}`,
      startTime,
      endTime,
      limit: 100
    })
    
    const response = await client.send(command)
    
    if (!response.events || response.events.length === 0) {
      console.log('No logs found in the specified time range')
      return
    }
    
    // Group logs by request
    const requests = new Map<string, any[]>()
    
    response.events.forEach(event => {
      if (event.message) {
        const message = event.message.trim()
        
        // Try to extract request ID or session ID
        const sessionMatch = message.match(/session[Id]*[:=\s]+([a-f0-9-]+)/i)
        const requestMatch = message.match(/requestId[:=\s]+([a-f0-9-]+)/i)
        
        const key = sessionMatch?.[1] || requestMatch?.[1] || 'unknown'
        
        if (!requests.has(key)) {
          requests.set(key, [])
        }
        
        requests.get(key)!.push({
          timestamp: new Date(event.timestamp!).toLocaleTimeString(),
          message: message
        })
      }
    })
    
    // Display logs grouped by request
    for (const [requestId, logs] of requests) {
      console.log(`\n--- Request/Session: ${requestId} ---`)
      
      // Look for createMultipleAgents calls
      const hasMultipleAgents = logs.some(log => 
        log.message.includes('createMultipleAgents') || 
        log.message.includes('multiple agents')
      )
      
      if (hasMultipleAgents) {
        console.log('🔴 FOUND createMultipleAgents execution!')
      }
      
      logs.forEach(log => {
        // Highlight important messages
        if (log.message.includes('ERROR') || log.message.includes('error')) {
          console.log(`❌ ${log.timestamp}: ${log.message}`)
        } else if (log.message.includes('timeout') || log.message.includes('Timeout')) {
          console.log(`⏱️ ${log.timestamp}: ${log.message}`)
        } else if (log.message.includes('createMultipleAgents')) {
          console.log(`👥 ${log.timestamp}: ${log.message}`)
        } else if (log.message.includes('Memory allocation') || log.message.includes('Duration:')) {
          console.log(`📊 ${log.timestamp}: ${log.message}`)
        } else {
          console.log(`   ${log.timestamp}: ${log.message}`)
        }
      })
    }
    
    // Show summary
    console.log(`\n=== Summary ===`)
    console.log(`Total log entries: ${response.events.length}`)
    console.log(`Unique requests: ${requests.size}`)
    
    // Check for errors
    const errors = response.events.filter(e => 
      e.message?.includes('ERROR') || 
      e.message?.includes('error') ||
      e.message?.includes('timeout')
    )
    
    if (errors.length > 0) {
      console.log(`\n⚠️ Found ${errors.length} error/timeout messages`)
    }
    
  } catch (error) {
    console.error('Error fetching logs:', error)
  }
}

// Run with optional parameters
const functionName = process.argv[2] || 'hawking-edison-dev-orchestrator'
const minutes = parseInt(process.argv[3] || '10')

checkLambdaLogs(functionName, minutes).then(() => process.exit(0))