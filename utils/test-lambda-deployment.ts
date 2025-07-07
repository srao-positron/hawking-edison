#!/usr/bin/env node
import { execSync } from 'child_process'

console.log('🔄 Testing Lambda deployment...\n')

try {
  // Check if AWS CLI can access our Lambda functions
  console.log('1️⃣ Listing Lambda functions...')
  const lambdas = execSync('aws lambda list-functions --query "Functions[?contains(FunctionName, \'hawking\')].[FunctionName, Runtime, State]" --output table', { encoding: 'utf-8' })
  console.log(lambdas)

  // Check SQS queue
  console.log('\n2️⃣ Checking SQS queue...')
  const queues = execSync('aws sqs list-queues --queue-name-prefix hawking --output json', { encoding: 'utf-8' })
  const queueData = JSON.parse(queues)
  console.log('Queues found:', queueData.QueueUrls || [])

  // Check SNS topic
  console.log('\n3️⃣ Checking SNS topic...')
  const topics = execSync('aws sns list-topics --output json', { encoding: 'utf-8' })
  const topicData = JSON.parse(topics)
  const hawkingTopics = topicData.Topics?.filter((t: any) => t.TopicArn.includes('hawking')) || []
  console.log('Topics found:', hawkingTopics.map((t: any) => t.TopicArn))

  // Check CloudFormation stack
  console.log('\n4️⃣ Checking CloudFormation stack...')
  const stack = execSync('aws cloudformation describe-stacks --stack-name hawking-edison-dev --query "Stacks[0].StackStatus" --output text', { encoding: 'utf-8' })
  console.log('Stack status:', stack.trim())

  console.log('\n✅ AWS infrastructure appears to be deployed!')

} catch (error: any) {
  console.error('❌ Error checking AWS deployment:', error.message)
  console.log('\nMake sure you have AWS CLI configured and the deployment completed successfully.')
}