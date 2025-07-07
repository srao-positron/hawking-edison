import * as cdk from 'aws-cdk-lib'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'

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

    // Note: The old task processing infrastructure has been removed
    // as we've moved to a tool-based architecture where the LLM
    // orchestrates operations directly through Supabase Edge Functions
  }
}