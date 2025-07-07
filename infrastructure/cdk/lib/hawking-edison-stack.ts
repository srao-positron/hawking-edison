import * as cdk from 'aws-cdk-lib'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions'
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as events from 'aws-cdk-lib/aws-events'
import * as targets from 'aws-cdk-lib/aws-events-targets'
import { Construct } from 'constructs'
import * as path from 'path'

export class HawkingEdisonStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Create secrets for API keys
    // This is kept for future use when we need to store sensitive data
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

    // Output the secret ARN for reference
    new cdk.CfnOutput(this, 'ApiKeysSecretArn', {
      value: apiKeysSecret.secretArn,
      description: 'ARN of the API keys secret',
    })

    // Create SNS topic for orchestration requests
    const orchestrationTopic = new sns.Topic(this, 'OrchestrationTopic', {
      displayName: 'Hawking Edison Orchestration Topic',
      topicName: 'hawking-edison-orchestration',
    })

    // Create SQS queue for orchestration messages
    const orchestrationQueue = new sqs.Queue(this, 'OrchestrationQueue', {
      queueName: 'hawking-edison-orchestration',
      visibilityTimeout: cdk.Duration.minutes(15), // Slightly longer than Lambda timeout
      retentionPeriod: cdk.Duration.days(7),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'OrchestrationDLQ', {
          queueName: 'hawking-edison-orchestration-dlq',
          retentionPeriod: cdk.Duration.days(14),
        }),
        maxReceiveCount: 3,
      },
    })

    // Subscribe queue to topic
    orchestrationTopic.addSubscription(
      new snsSubscriptions.SqsSubscription(orchestrationQueue)
    )

    // Create Lambda orchestrator function
    const orchestratorFunction = new lambdaNodejs.NodejsFunction(this, 'Orchestrator', {
      entry: path.join(__dirname, '../lambda/orchestrator.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.minutes(14), // Max Lambda timeout minus buffer
      memorySize: 1024,
      environment: {
        SUPABASE_URL: process.env.SUPABASE_URL || 'PLACEHOLDER',
        ORCHESTRATION_TOPIC_ARN: orchestrationTopic.topicArn,
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        minify: false,
        sourceMap: true,
        target: 'es2022',
        externalModules: ['aws-sdk'],
      },
    })

    // Grant permissions to read from secrets
    apiKeysSecret.grantRead(orchestratorFunction)

    // Grant permissions to publish to SNS
    orchestrationTopic.grantPublish(orchestratorFunction)

    // Add SQS event source
    orchestratorFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(orchestrationQueue, {
        batchSize: 1, // Process one orchestration at a time
        maxBatchingWindow: cdk.Duration.seconds(0), // No batching delay
      })
    )

    // Grant Edge Functions permission to publish to SNS
    // This requires creating an IAM user for Supabase Edge Functions
    const edgeFunctionUser = new iam.User(this, 'EdgeFunctionUser', {
      userName: 'hawking-edison-edge-functions',
    })

    // Create access key for Edge Function user
    const accessKey = new iam.AccessKey(this, 'EdgeFunctionAccessKey', {
      user: edgeFunctionUser,
    })

    // Grant publish permissions
    orchestrationTopic.grantPublish(edgeFunctionUser)

    // Store Edge Function credentials in Secrets Manager
    const edgeFunctionCredsSecret = new secretsmanager.Secret(this, 'EdgeFunctionCreds', {
      secretName: 'hawking-edison/edge-function-creds',
      description: 'AWS credentials for Supabase Edge Functions',
      secretObjectValue: {
        accessKeyId: cdk.SecretValue.unsafePlainText(accessKey.accessKeyId),
        secretAccessKey: accessKey.secretAccessKey,
        region: cdk.SecretValue.unsafePlainText(this.region),
        topicArn: cdk.SecretValue.unsafePlainText(orchestrationTopic.topicArn),
      },
    })

    // Outputs
    new cdk.CfnOutput(this, 'OrchestrationTopicArn', {
      value: orchestrationTopic.topicArn,
      description: 'ARN of the orchestration SNS topic',
    })

    new cdk.CfnOutput(this, 'OrchestrationQueueUrl', {
      value: orchestrationQueue.queueUrl,
      description: 'URL of the orchestration SQS queue',
    })

    new cdk.CfnOutput(this, 'OrchestratorFunctionArn', {
      value: orchestratorFunction.functionArn,
      description: 'ARN of the orchestrator Lambda function',
    })

    new cdk.CfnOutput(this, 'EdgeFunctionCredsSecretArn', {
      value: edgeFunctionCredsSecret.secretArn,
      description: 'ARN of the Edge Function AWS credentials secret',
    })

    // Create poller Lambda to check for pending orchestration sessions
    const pollerFunction = new lambdaNodejs.NodejsFunction(this, 'OrchestrationPoller', {
      entry: path.join(__dirname, '../lambda/orchestration-poller.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.minutes(1),
      memorySize: 256,
      environment: {
        SUPABASE_URL: process.env.SUPABASE_URL || 'PLACEHOLDER',
        ORCHESTRATION_TOPIC_ARN: orchestrationTopic.topicArn,
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        minify: false,
        sourceMap: true,
        target: 'es2022',
        externalModules: ['aws-sdk'],
      },
    })

    // Grant permissions to read from secrets
    apiKeysSecret.grantRead(pollerFunction)

    // Grant permissions to publish to SNS
    orchestrationTopic.grantPublish(pollerFunction)

    // Create scheduled rule to run every minute
    const pollerRule = new events.Rule(this, 'OrchestrationPollerRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      description: 'Trigger orchestration poller every minute',
    })

    // Add Lambda as target
    pollerRule.addTarget(new targets.LambdaFunction(pollerFunction))

    new cdk.CfnOutput(this, 'PollerFunctionArn', {
      value: pollerFunction.functionArn,
      description: 'ARN of the orchestration poller Lambda function',
    })
  }
}