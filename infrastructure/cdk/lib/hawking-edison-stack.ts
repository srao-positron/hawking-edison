import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { Construct } from 'constructs'
import * as path from 'path'

export class HawkingEdisonStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Create secrets for API keys
    const apiKeysSecret = new secretsmanager.Secret(this, 'ApiKeys', {
      secretName: 'hawking-edison/api-keys',
      description: 'API keys for LLM providers and Supabase',
      secretObjectValue: {
        SUPABASE_URL: cdk.SecretValue.unsafePlainText('PLACEHOLDER'),
        SUPABASE_SERVICE_ROLE_KEY: cdk.SecretValue.unsafePlainText('PLACEHOLDER'),
        ANTHROPIC_API_KEY: cdk.SecretValue.unsafePlainText('PLACEHOLDER'),
        OPENAI_API_KEY: cdk.SecretValue.unsafePlainText('PLACEHOLDER'),
      },
    })

    // Create DLQ for failed messages
    const deadLetterQueue = new sqs.Queue(this, 'TaskDLQ', {
      queueName: 'hawking-edison-task-dlq',
      retentionPeriod: cdk.Duration.days(14),
    })

    // Create SQS queue for tasks
    const taskQueue = new sqs.Queue(this, 'TaskQueue', {
      queueName: 'hawking-edison-task-queue',
      visibilityTimeout: cdk.Duration.minutes(15),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
    })

    // Create SNS topic for task distribution
    const taskTopic = new sns.Topic(this, 'TaskTopic', {
      topicName: 'hawking-edison-tasks',
      displayName: 'Hawking Edison Async Tasks',
    })

    // Subscribe SQS to SNS
    taskTopic.addSubscription(new subscriptions.SqsSubscription(taskQueue))

    // Create Lambda function for task processing
    const taskProcessor = new lambdaNodejs.NodejsFunction(this, 'TaskProcessor', {
      functionName: 'hawking-edison-task-processor',
      entry: path.join(__dirname, '../lambda/task-processor.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.minutes(15),
      memorySize: 3008, // 3GB for LLM operations
      environment: {
        SECRETS_ARN: apiKeysSecret.secretArn,
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
        sourceMap: true,
        minify: false,
        target: 'es2020',
      },
    })

    // Grant Lambda permission to read secrets
    apiKeysSecret.grantRead(taskProcessor)

    // Grant Lambda permission to receive messages from SQS
    taskQueue.grantConsumeMessages(taskProcessor)

    // Add SQS event source to Lambda
    taskProcessor.addEventSource(new SqsEventSource(taskQueue, {
      batchSize: 1, // Process one task at a time for now
      maxBatchingWindow: cdk.Duration.seconds(5),
    }))

    // Create IAM user for Vercel to publish to SNS
    const vercelUser = new iam.User(this, 'VercelSnsUser', {
      userName: 'hawking-edison-vercel',
    })

    // Grant Vercel user permission to publish to SNS
    taskTopic.grantPublish(vercelUser)

    // Create access key for Vercel user
    const accessKey = new iam.AccessKey(this, 'VercelAccessKey', {
      user: vercelUser,
    })

    // Output important values
    new cdk.CfnOutput(this, 'TaskTopicArn', {
      value: taskTopic.topicArn,
      description: 'ARN of the SNS topic for task submission',
    })

    new cdk.CfnOutput(this, 'TaskQueueUrl', {
      value: taskQueue.queueUrl,
      description: 'URL of the SQS queue',
    })

    new cdk.CfnOutput(this, 'VercelAccessKeyId', {
      value: accessKey.accessKeyId,
      description: 'Access key ID for Vercel',
    })

    new cdk.CfnOutput(this, 'VercelSecretAccessKey', {
      value: accessKey.secretAccessKey.unsafeUnwrap(),
      description: 'Secret access key for Vercel (save this securely!)',
    })

    new cdk.CfnOutput(this, 'ApiKeysSecretArn', {
      value: apiKeysSecret.secretArn,
      description: 'ARN of the API keys secret',
    })
  }
}