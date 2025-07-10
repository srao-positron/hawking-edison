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
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
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
        externalModules: [],
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
    // Use a timestamp to ensure unique name in case of conflicts
    const timestamp = Date.now()
    const edgeFunctionUser = new iam.User(this, 'EdgeFunctionUser', {
      userName: `hawking-edison-edge-functions-${timestamp}`,
    })

    // Create access key for Edge Function user
    const accessKey = new iam.AccessKey(this, 'EdgeFunctionAccessKey', {
      user: edgeFunctionUser,
    })

    // Grant publish permissions
    orchestrationTopic.grantPublish(edgeFunctionUser)

    // Store Edge Function credentials in Secrets Manager (for backup)
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

    // Create Lambda function to store credentials in Vault
    const vaultCredentialManager = new lambdaNodejs.NodejsFunction(this, 'VaultCredentialManager', {
      entry: path.join(__dirname, '../lambda/vault-credential-manager.ts'),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      timeout: cdk.Duration.minutes(2),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        minify: false,
        sourceMap: true,
        target: 'es2022',
        externalModules: [],
      },
    })

    // Store the secret access key in environment for the Lambda to retrieve
    vaultCredentialManager.addEnvironment('ACCESS_KEY_ID', accessKey.accessKeyId)
    vaultCredentialManager.addEnvironment('REGION', this.region)
    vaultCredentialManager.addEnvironment('TOPIC_ARN', orchestrationTopic.topicArn)
    vaultCredentialManager.addEnvironment('SUPABASE_URL', process.env.SUPABASE_URL || 'PLACEHOLDER')
    vaultCredentialManager.addEnvironment('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY || 'PLACEHOLDER')
    
    // Grant permission to retrieve the secret
    edgeFunctionCredsSecret.grantRead(vaultCredentialManager)
    
    // Use custom resource to store credentials in Vault
    const storeInVault = new cdk.CustomResource(this, 'StoreCredsInVault', {
      serviceToken: vaultCredentialManager.functionArn,
      properties: {
        SecretArn: edgeFunctionCredsSecret.secretArn,
      }
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

    // Create resumption Lambda to handle orchestration timeouts
    // This is triggered by the orchestrator when it needs to resume
    const resumptionFunction = new lambdaNodejs.NodejsFunction(this, 'OrchestrationResumption', {
      entry: path.join(__dirname, '../lambda/orchestration-resumption.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
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
        externalModules: [],
      },
    })

    // Grant permissions to read from secrets
    apiKeysSecret.grantRead(resumptionFunction)

    // Grant permissions to publish to SNS
    orchestrationTopic.grantPublish(resumptionFunction)

    // Create DynamoDB table for tracking active sessions
    // This allows us to avoid polling and only process when needed
    const activeSessionsTable = new dynamodb.Table(this, 'ActiveOrchestrationSessions', {
      tableName: 'hawking-edison-active-sessions',
      partitionKey: {
        name: 'sessionId',
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: 'ttl',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev - change to RETAIN for prod
    })

    // Grant orchestrator permissions to read/write active sessions
    activeSessionsTable.grantReadWriteData(orchestratorFunction)
    activeSessionsTable.grantReadWriteData(resumptionFunction)

    // Add environment variable for table name
    orchestratorFunction.addEnvironment('ACTIVE_SESSIONS_TABLE', activeSessionsTable.tableName)
    resumptionFunction.addEnvironment('ACTIVE_SESSIONS_TABLE', activeSessionsTable.tableName)

    new cdk.CfnOutput(this, 'ResumptionFunctionArn', {
      value: resumptionFunction.functionArn,
      description: 'ARN of the orchestration resumption Lambda function',
    })

    new cdk.CfnOutput(this, 'ActiveSessionsTableName', {
      value: activeSessionsTable.tableName,
      description: 'Name of the active sessions DynamoDB table',
    })
  }
}