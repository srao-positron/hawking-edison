#!/usr/bin/env node
/**
 * Test Lambda function locally
 */

import { handler } from '../infrastructure/cdk/lambda/task-processor'
import { SQSEvent } from 'aws-lambda'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Mock secrets
process.env.SECRETS_ARN = 'arn:aws:secretsmanager:us-east-2:600771336675:secret:hawking-edison/api-keys-eVJEgR'
process.env.AWS_REGION = 'us-east-2'

async function testLambda() {
  console.log('🧪 Testing Lambda function locally...\n')

  // Create a mock SQS event
  const mockEvent: SQSEvent = {
    Records: [
      {
        messageId: 'test-message-1',
        receiptHandle: 'test-receipt-1',
        body: JSON.stringify({
          Message: JSON.stringify({
            id: 'test-task-1',
            userId: 'test-user-1',
            type: 'simulation',
            config: {
              agents: 3,
              topic: 'Climate change solutions',
              rounds: 2,
            },
            createdAt: new Date().toISOString(),
          }),
        }),
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: Date.now().toString(),
          SenderId: 'test-sender',
          ApproximateFirstReceiveTimestamp: Date.now().toString(),
        },
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789:test-queue',
        awsRegion: 'us-east-1',
      },
    ],
  }

  try {
    console.log('Calling Lambda handler...')
    const result = await handler(mockEvent)
    console.log('\n✅ Lambda execution successful!')
    console.log('Result:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('\n❌ Lambda execution failed:', error)
  }
}

// Test different task types
async function testAllTaskTypes() {
  const taskTypes = [
    {
      type: 'simulation',
      config: {
        agents: 3,
        topic: 'Future of AI',
        rounds: 2,
      },
    },
    {
      type: 'panel',
      config: {
        panelists: ['Expert 1', 'Expert 2', 'Expert 3'],
        topic: 'Quantum Computing',
        duration: 30,
      },
    },
    {
      type: 'discussion',
      config: {
        participants: ['Alice', 'Bob', 'Charlie'],
        topic: 'Space Exploration',
        style: 'debate',
      },
    },
    {
      type: 'analysis',
      config: {
        data: { metric1: 100, metric2: 200 },
        analysisType: 'trend',
        provider: 'anthropic',
      },
    },
  ]

  for (const task of taskTypes) {
    console.log(`\n📋 Testing ${task.type} task...`)
    const event: SQSEvent = {
      Records: [
        {
          messageId: `test-${task.type}`,
          receiptHandle: 'test-receipt',
          body: JSON.stringify({
            Message: JSON.stringify({
              id: `test-${task.type}-id`,
              userId: 'test-user',
              type: task.type,
              config: task.config,
              createdAt: new Date().toISOString(),
            }),
          }),
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: Date.now().toString(),
            SenderId: 'test',
            ApproximateFirstReceiveTimestamp: Date.now().toString(),
          },
          messageAttributes: {},
          md5OfBody: 'test',
          eventSource: 'aws:sqs',
          eventSourceARN: 'test',
          awsRegion: 'us-east-1',
        },
      ],
    }

    try {
      await handler(event)
      console.log(`✅ ${task.type} task completed`)
    } catch (error) {
      console.error(`❌ ${task.type} task failed:`, error)
    }
  }
}

// Run tests
const command = process.argv[2]
if (command === 'all') {
  testAllTaskTypes().catch(console.error)
} else {
  testLambda().catch(console.error)
}