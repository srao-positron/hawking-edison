#!/usr/bin/env node
/**
 * Test the tasks API endpoint
 */

import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testTaskAPI() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  console.log('🧪 Testing tasks API...\n')
  console.log('URL:', `${baseUrl}/api/tasks`)
  
  // First, we need to get an auth token
  // For testing, we'll use the test user credentials
  const authResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'test123456', // You'll need to create this test user
    }),
  })
  
  if (!authResponse.ok) {
    console.error('❌ Authentication failed')
    console.log('Please create a test user first or update credentials')
    return
  }
  
  const { token } = await authResponse.json()
  
  // Test creating a simulation task
  const taskData = {
    type: 'simulation',
    config: {
      agents: 3,
      topic: 'Future of renewable energy',
      rounds: 2,
    },
  }
  
  console.log('📤 Sending task:', JSON.stringify(taskData, null, 2))
  
  const response = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(taskData),
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('❌ Task creation failed:', error)
    return
  }
  
  const result = await response.json()
  console.log('\n✅ Task created successfully!')
  console.log('Response:', JSON.stringify(result, null, 2))
  
  // Check task status
  console.log('\n📊 Checking task status...')
  const statusResponse = await fetch(`${baseUrl}/api/tasks?id=${result.task.id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
  
  if (statusResponse.ok) {
    const status = await statusResponse.json()
    console.log('Task status:', JSON.stringify(status, null, 2))
  }
}

// Test with local API
async function testLocal() {
  // For local testing, we can bypass auth
  const taskData = {
    type: 'simulation',
    config: {
      agents: 3,
      topic: 'Future of renewable energy',
      rounds: 2,
    },
  }
  
  console.log('📤 Testing local task creation...\n')
  
  // Simulate the API call locally
  console.log('Task data:', JSON.stringify(taskData, null, 2))
  console.log('\nThis would be sent to:')
  console.log('- SNS Topic:', process.env.SNS_TOPIC_ARN)
  console.log('- Using AWS credentials from environment')
}

// Run the test
const isLocal = process.argv[2] === 'local'
if (isLocal) {
  testLocal().catch(console.error)
} else {
  testTaskAPI().catch(console.error)
}