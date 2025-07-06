"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HawkingEdisonStack = void 0;
const cdk = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const sns = require("aws-cdk-lib/aws-sns");
const sqs = require("aws-cdk-lib/aws-sqs");
const subscriptions = require("aws-cdk-lib/aws-sns-subscriptions");
const iam = require("aws-cdk-lib/aws-iam");
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");
const lambdaNodejs = require("aws-cdk-lib/aws-lambda-nodejs");
const aws_lambda_event_sources_1 = require("aws-cdk-lib/aws-lambda-event-sources");
const path = require("path");
class HawkingEdisonStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
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
        });
        // Create DLQ for failed messages
        const deadLetterQueue = new sqs.Queue(this, 'TaskDLQ', {
            queueName: 'hawking-edison-task-dlq',
            retentionPeriod: cdk.Duration.days(14),
        });
        // Create SQS queue for tasks
        const taskQueue = new sqs.Queue(this, 'TaskQueue', {
            queueName: 'hawking-edison-task-queue',
            visibilityTimeout: cdk.Duration.minutes(15),
            deadLetterQueue: {
                queue: deadLetterQueue,
                maxReceiveCount: 3,
            },
        });
        // Create SNS topic for task distribution
        const taskTopic = new sns.Topic(this, 'TaskTopic', {
            topicName: 'hawking-edison-tasks',
            displayName: 'Hawking Edison Async Tasks',
        });
        // Subscribe SQS to SNS
        taskTopic.addSubscription(new subscriptions.SqsSubscription(taskQueue));
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
        });
        // Grant Lambda permission to read secrets
        apiKeysSecret.grantRead(taskProcessor);
        // Grant Lambda permission to receive messages from SQS
        taskQueue.grantConsumeMessages(taskProcessor);
        // Add SQS event source to Lambda
        taskProcessor.addEventSource(new aws_lambda_event_sources_1.SqsEventSource(taskQueue, {
            batchSize: 1, // Process one task at a time for now
            maxBatchingWindow: cdk.Duration.seconds(5),
        }));
        // Create IAM user for Vercel to publish to SNS
        const vercelUser = new iam.User(this, 'VercelSnsUser', {
            userName: 'hawking-edison-vercel',
        });
        // Grant Vercel user permission to publish to SNS
        taskTopic.grantPublish(vercelUser);
        // Create access key for Vercel user
        const accessKey = new iam.AccessKey(this, 'VercelAccessKey', {
            user: vercelUser,
        });
        // Output important values
        new cdk.CfnOutput(this, 'TaskTopicArn', {
            value: taskTopic.topicArn,
            description: 'ARN of the SNS topic for task submission',
        });
        new cdk.CfnOutput(this, 'TaskQueueUrl', {
            value: taskQueue.queueUrl,
            description: 'URL of the SQS queue',
        });
        new cdk.CfnOutput(this, 'VercelAccessKeyId', {
            value: accessKey.accessKeyId,
            description: 'Access key ID for Vercel',
        });
        new cdk.CfnOutput(this, 'VercelSecretAccessKey', {
            value: accessKey.secretAccessKey.unsafeUnwrap(),
            description: 'Secret access key for Vercel (save this securely!)',
        });
        new cdk.CfnOutput(this, 'ApiKeysSecretArn', {
            value: apiKeysSecret.secretArn,
            description: 'ARN of the API keys secret',
        });
    }
}
exports.HawkingEdisonStack = HawkingEdisonStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGF3a2luZy1lZGlzb24tc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9saWIvaGF3a2luZy1lZGlzb24tc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQWtDO0FBQ2xDLGlEQUFnRDtBQUNoRCwyQ0FBMEM7QUFDMUMsMkNBQTBDO0FBQzFDLG1FQUFrRTtBQUNsRSwyQ0FBMEM7QUFDMUMsaUVBQWdFO0FBQ2hFLDhEQUE2RDtBQUM3RCxtRkFBcUU7QUFFckUsNkJBQTRCO0FBRTVCLE1BQWEsa0JBQW1CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2Qiw4QkFBOEI7UUFDOUIsTUFBTSxhQUFhLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDL0QsVUFBVSxFQUFFLHlCQUF5QjtZQUNyQyxXQUFXLEVBQUUseUNBQXlDO1lBQ3RELGlCQUFpQixFQUFFO2dCQUNqQixZQUFZLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDO2dCQUM1RCx5QkFBeUIsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUM7Z0JBQ3pFLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQztnQkFDakUsY0FBYyxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQzthQUMvRDtTQUNGLENBQUMsQ0FBQTtRQUVGLGlDQUFpQztRQUNqQyxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtZQUNyRCxTQUFTLEVBQUUseUJBQXlCO1lBQ3BDLGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7U0FDdkMsQ0FBQyxDQUFBO1FBRUYsNkJBQTZCO1FBQzdCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQ2pELFNBQVMsRUFBRSwyQkFBMkI7WUFDdEMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzNDLGVBQWUsRUFBRTtnQkFDZixLQUFLLEVBQUUsZUFBZTtnQkFDdEIsZUFBZSxFQUFFLENBQUM7YUFDbkI7U0FDRixDQUFDLENBQUE7UUFFRix5Q0FBeUM7UUFDekMsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDakQsU0FBUyxFQUFFLHNCQUFzQjtZQUNqQyxXQUFXLEVBQUUsNEJBQTRCO1NBQzFDLENBQUMsQ0FBQTtRQUVGLHVCQUF1QjtRQUN2QixTQUFTLENBQUMsZUFBZSxDQUFDLElBQUksYUFBYSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBRXZFLDZDQUE2QztRQUM3QyxNQUFNLGFBQWEsR0FBRyxJQUFJLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUMzRSxZQUFZLEVBQUUsK0JBQStCO1lBQzdDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSw2QkFBNkIsQ0FBQztZQUMxRCxPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLElBQUksRUFBRSx5QkFBeUI7WUFDM0MsV0FBVyxFQUFFO2dCQUNYLFdBQVcsRUFBRSxhQUFhLENBQUMsU0FBUztnQkFDcEMsWUFBWSxFQUFFLHNCQUFzQjthQUNyQztZQUNELFFBQVEsRUFBRTtnQkFDUixlQUFlLEVBQUUsQ0FBQyxZQUFZLENBQUM7Z0JBQy9CLFNBQVMsRUFBRSxJQUFJO2dCQUNmLE1BQU0sRUFBRSxLQUFLO2dCQUNiLE1BQU0sRUFBRSxRQUFRO2FBQ2pCO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsMENBQTBDO1FBQzFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFdEMsdURBQXVEO1FBQ3ZELFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUU3QyxpQ0FBaUM7UUFDakMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxJQUFJLHlDQUFjLENBQUMsU0FBUyxFQUFFO1lBQ3pELFNBQVMsRUFBRSxDQUFDLEVBQUUscUNBQXFDO1lBQ25ELGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUMzQyxDQUFDLENBQUMsQ0FBQTtRQUVILCtDQUErQztRQUMvQyxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUNyRCxRQUFRLEVBQUUsdUJBQXVCO1NBQ2xDLENBQUMsQ0FBQTtRQUVGLGlEQUFpRDtRQUNqRCxTQUFTLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRWxDLG9DQUFvQztRQUNwQyxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQzNELElBQUksRUFBRSxVQUFVO1NBQ2pCLENBQUMsQ0FBQTtRQUVGLDBCQUEwQjtRQUMxQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0QyxLQUFLLEVBQUUsU0FBUyxDQUFDLFFBQVE7WUFDekIsV0FBVyxFQUFFLDBDQUEwQztTQUN4RCxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0QyxLQUFLLEVBQUUsU0FBUyxDQUFDLFFBQVE7WUFDekIsV0FBVyxFQUFFLHNCQUFzQjtTQUNwQyxDQUFDLENBQUE7UUFFRixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQzNDLEtBQUssRUFBRSxTQUFTLENBQUMsV0FBVztZQUM1QixXQUFXLEVBQUUsMEJBQTBCO1NBQ3hDLENBQUMsQ0FBQTtRQUVGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDL0MsS0FBSyxFQUFFLFNBQVMsQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFO1lBQy9DLFdBQVcsRUFBRSxvREFBb0Q7U0FDbEUsQ0FBQyxDQUFBO1FBRUYsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsYUFBYSxDQUFDLFNBQVM7WUFDOUIsV0FBVyxFQUFFLDRCQUE0QjtTQUMxQyxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Y7QUFoSEQsZ0RBZ0hDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJ1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnXG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucydcbmltcG9ydCAqIGFzIHNxcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3FzJ1xuaW1wb3J0ICogYXMgc3Vic2NyaXB0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zLXN1YnNjcmlwdGlvbnMnXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSdcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcidcbmltcG9ydCAqIGFzIGxhbWJkYU5vZGVqcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcydcbmltcG9ydCB7IFNxc0V2ZW50U291cmNlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ldmVudC1zb3VyY2VzJ1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGNsYXNzIEhhd2tpbmdFZGlzb25TdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKVxuXG4gICAgLy8gQ3JlYXRlIHNlY3JldHMgZm9yIEFQSSBrZXlzXG4gICAgY29uc3QgYXBpS2V5c1NlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0FwaUtleXMnLCB7XG4gICAgICBzZWNyZXROYW1lOiAnaGF3a2luZy1lZGlzb24vYXBpLWtleXMnLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkga2V5cyBmb3IgTExNIHByb3ZpZGVycyBhbmQgU3VwYWJhc2UnLFxuICAgICAgc2VjcmV0T2JqZWN0VmFsdWU6IHtcbiAgICAgICAgU1VQQUJBU0VfVVJMOiBjZGsuU2VjcmV0VmFsdWUudW5zYWZlUGxhaW5UZXh0KCdQTEFDRUhPTERFUicpLFxuICAgICAgICBTVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZOiBjZGsuU2VjcmV0VmFsdWUudW5zYWZlUGxhaW5UZXh0KCdQTEFDRUhPTERFUicpLFxuICAgICAgICBBTlRIUk9QSUNfQVBJX0tFWTogY2RrLlNlY3JldFZhbHVlLnVuc2FmZVBsYWluVGV4dCgnUExBQ0VIT0xERVInKSxcbiAgICAgICAgT1BFTkFJX0FQSV9LRVk6IGNkay5TZWNyZXRWYWx1ZS51bnNhZmVQbGFpblRleHQoJ1BMQUNFSE9MREVSJyksXG4gICAgICB9LFxuICAgIH0pXG5cbiAgICAvLyBDcmVhdGUgRExRIGZvciBmYWlsZWQgbWVzc2FnZXNcbiAgICBjb25zdCBkZWFkTGV0dGVyUXVldWUgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdUYXNrRExRJywge1xuICAgICAgcXVldWVOYW1lOiAnaGF3a2luZy1lZGlzb24tdGFzay1kbHEnLFxuICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uZGF5cygxNCksXG4gICAgfSlcblxuICAgIC8vIENyZWF0ZSBTUVMgcXVldWUgZm9yIHRhc2tzXG4gICAgY29uc3QgdGFza1F1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnVGFza1F1ZXVlJywge1xuICAgICAgcXVldWVOYW1lOiAnaGF3a2luZy1lZGlzb24tdGFzay1xdWV1ZScsXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLFxuICAgICAgZGVhZExldHRlclF1ZXVlOiB7XG4gICAgICAgIHF1ZXVlOiBkZWFkTGV0dGVyUXVldWUsXG4gICAgICAgIG1heFJlY2VpdmVDb3VudDogMyxcbiAgICAgIH0sXG4gICAgfSlcblxuICAgIC8vIENyZWF0ZSBTTlMgdG9waWMgZm9yIHRhc2sgZGlzdHJpYnV0aW9uXG4gICAgY29uc3QgdGFza1RvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnVGFza1RvcGljJywge1xuICAgICAgdG9waWNOYW1lOiAnaGF3a2luZy1lZGlzb24tdGFza3MnLFxuICAgICAgZGlzcGxheU5hbWU6ICdIYXdraW5nIEVkaXNvbiBBc3luYyBUYXNrcycsXG4gICAgfSlcblxuICAgIC8vIFN1YnNjcmliZSBTUVMgdG8gU05TXG4gICAgdGFza1RvcGljLmFkZFN1YnNjcmlwdGlvbihuZXcgc3Vic2NyaXB0aW9ucy5TcXNTdWJzY3JpcHRpb24odGFza1F1ZXVlKSlcblxuICAgIC8vIENyZWF0ZSBMYW1iZGEgZnVuY3Rpb24gZm9yIHRhc2sgcHJvY2Vzc2luZ1xuICAgIGNvbnN0IHRhc2tQcm9jZXNzb3IgPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdUYXNrUHJvY2Vzc29yJywge1xuICAgICAgZnVuY3Rpb25OYW1lOiAnaGF3a2luZy1lZGlzb24tdGFzay1wcm9jZXNzb3InLFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9sYW1iZGEvdGFzay1wcm9jZXNzb3IudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLFxuICAgICAgbWVtb3J5U2l6ZTogMzAwOCwgLy8gM0dCIGZvciBMTE0gb3BlcmF0aW9uc1xuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU0VDUkVUU19BUk46IGFwaUtleXNTZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgICBOT0RFX09QVElPTlM6ICctLWVuYWJsZS1zb3VyY2UtbWFwcycsXG4gICAgICB9LFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcbiAgICAgICAgc291cmNlTWFwOiB0cnVlLFxuICAgICAgICBtaW5pZnk6IGZhbHNlLFxuICAgICAgICB0YXJnZXQ6ICdlczIwMjAnLFxuICAgICAgfSxcbiAgICB9KVxuXG4gICAgLy8gR3JhbnQgTGFtYmRhIHBlcm1pc3Npb24gdG8gcmVhZCBzZWNyZXRzXG4gICAgYXBpS2V5c1NlY3JldC5ncmFudFJlYWQodGFza1Byb2Nlc3NvcilcblxuICAgIC8vIEdyYW50IExhbWJkYSBwZXJtaXNzaW9uIHRvIHJlY2VpdmUgbWVzc2FnZXMgZnJvbSBTUVNcbiAgICB0YXNrUXVldWUuZ3JhbnRDb25zdW1lTWVzc2FnZXModGFza1Byb2Nlc3NvcilcblxuICAgIC8vIEFkZCBTUVMgZXZlbnQgc291cmNlIHRvIExhbWJkYVxuICAgIHRhc2tQcm9jZXNzb3IuYWRkRXZlbnRTb3VyY2UobmV3IFNxc0V2ZW50U291cmNlKHRhc2tRdWV1ZSwge1xuICAgICAgYmF0Y2hTaXplOiAxLCAvLyBQcm9jZXNzIG9uZSB0YXNrIGF0IGEgdGltZSBmb3Igbm93XG4gICAgICBtYXhCYXRjaGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXG4gICAgfSkpXG5cbiAgICAvLyBDcmVhdGUgSUFNIHVzZXIgZm9yIFZlcmNlbCB0byBwdWJsaXNoIHRvIFNOU1xuICAgIGNvbnN0IHZlcmNlbFVzZXIgPSBuZXcgaWFtLlVzZXIodGhpcywgJ1ZlcmNlbFNuc1VzZXInLCB7XG4gICAgICB1c2VyTmFtZTogJ2hhd2tpbmctZWRpc29uLXZlcmNlbCcsXG4gICAgfSlcblxuICAgIC8vIEdyYW50IFZlcmNlbCB1c2VyIHBlcm1pc3Npb24gdG8gcHVibGlzaCB0byBTTlNcbiAgICB0YXNrVG9waWMuZ3JhbnRQdWJsaXNoKHZlcmNlbFVzZXIpXG5cbiAgICAvLyBDcmVhdGUgYWNjZXNzIGtleSBmb3IgVmVyY2VsIHVzZXJcbiAgICBjb25zdCBhY2Nlc3NLZXkgPSBuZXcgaWFtLkFjY2Vzc0tleSh0aGlzLCAnVmVyY2VsQWNjZXNzS2V5Jywge1xuICAgICAgdXNlcjogdmVyY2VsVXNlcixcbiAgICB9KVxuXG4gICAgLy8gT3V0cHV0IGltcG9ydGFudCB2YWx1ZXNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGFza1RvcGljQXJuJywge1xuICAgICAgdmFsdWU6IHRhc2tUb3BpYy50b3BpY0FybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBTTlMgdG9waWMgZm9yIHRhc2sgc3VibWlzc2lvbicsXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUYXNrUXVldWVVcmwnLCB7XG4gICAgICB2YWx1ZTogdGFza1F1ZXVlLnF1ZXVlVXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdVUkwgb2YgdGhlIFNRUyBxdWV1ZScsXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdWZXJjZWxBY2Nlc3NLZXlJZCcsIHtcbiAgICAgIHZhbHVlOiBhY2Nlc3NLZXkuYWNjZXNzS2V5SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FjY2VzcyBrZXkgSUQgZm9yIFZlcmNlbCcsXG4gICAgfSlcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdWZXJjZWxTZWNyZXRBY2Nlc3NLZXknLCB7XG4gICAgICB2YWx1ZTogYWNjZXNzS2V5LnNlY3JldEFjY2Vzc0tleS51bnNhZmVVbndyYXAoKSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjcmV0IGFjY2VzcyBrZXkgZm9yIFZlcmNlbCAoc2F2ZSB0aGlzIHNlY3VyZWx5ISknLFxuICAgIH0pXG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpS2V5c1NlY3JldEFybicsIHtcbiAgICAgIHZhbHVlOiBhcGlLZXlzU2VjcmV0LnNlY3JldEFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBBUEkga2V5cyBzZWNyZXQnLFxuICAgIH0pXG4gIH1cbn0iXX0=