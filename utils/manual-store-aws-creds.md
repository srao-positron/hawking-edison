# Manual AWS Credential Storage

Since the CDK deployment partially succeeded, the AWS resources exist but the credentials weren't stored in Vault.

## Step 1: Get the Credentials

### Option A: From Secrets Manager
1. Go to [AWS Console](https://console.aws.amazon.com) > Secrets Manager
2. Find `hawking-edison/edge-function-creds`
3. Click "Retrieve secret value"
4. Copy the JSON containing:
   - `accessKeyId`
   - `secretAccessKey`

### Option B: From CloudFormation Outputs
1. Go to [AWS Console](https://console.aws.amazon.com) > CloudFormation
2. Find stack `hawking-edison-dev`
3. Go to "Outputs" tab
4. Look for:
   - `EdgeFunctionAccessKeyId`
   - `OrchestrationTopicArn`
5. For the secret key, you'll need to check Secrets Manager (Option A)

## Step 2: Store in Vault

Once you have all the values, run:

```bash
npx tsx utils/quick-store-aws-creds.ts \
  <ACCESS_KEY_ID> \
  <SECRET_ACCESS_KEY> \
  us-east-1 \
  <TOPIC_ARN>
```

Example with placeholder values:
```bash
npx tsx utils/quick-store-aws-creds.ts \
  AKIAIOSFODNN7EXAMPLE \
  wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  us-east-1 \
  arn:aws:sns:us-east-1:600771336675:hawking-edison-dev-orchestration
```

## Step 3: Verify

The script will:
1. Store the credentials in Vault
2. Verify they were stored correctly
3. Confirm Edge Functions can now use them

## What This Achieves

This manual process accomplishes the same goal as the failing CDK custom resource:
- AWS credentials are securely stored in Supabase Vault
- Edge Functions automatically retrieve them when needed
- No more manual updates after deployments!

## Next Steps

After storing the credentials:
1. The chat functionality should work end-to-end
2. Edge Functions can publish to SNS
3. Lambda functions process LLM requests
4. Results stream back via SSE