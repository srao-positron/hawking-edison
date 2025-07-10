# Manual Steps to Complete the Setup

The CDK has created all the AWS resources, but the automatic credential storage is failing due to environment variable issues. Let's complete it manually.

## Step 1: Get the AWS Credentials

### From AWS Console:

1. **Access Key ID** - Go to CloudFormation > hawking-edison-dev > Outputs
   - Look for `EdgeFunctionAccessKeyId`
   - Example: `AKIAIOSFODNN7EXAMPLE`

2. **Secret Access Key** - Go to Secrets Manager
   - Find `hawking-edison/edge-function-creds`
   - Click "Retrieve secret value"
   - Copy the `secretAccessKey` value

3. **Topic ARN** - From CloudFormation Outputs
   - Look for `OrchestrationTopicArn`
   - Example: `arn:aws:sns:us-east-1:600771336675:hawking-edison-dev-orchestration`

## Step 2: Store in Vault

Run this command with the actual values:

```bash
npx tsx utils/quick-store-aws-creds.ts \
  <ACCESS_KEY_ID> \
  <SECRET_ACCESS_KEY> \
  us-east-1 \
  <TOPIC_ARN>
```

## Step 3: Verify

```bash
npx tsx utils/verify-vault-automation.ts
```

## What This Achieves

Once the credentials are in Vault:
- ✅ Edge Functions can publish to SNS
- ✅ Lambda processes LLM requests  
- ✅ Results stream back via SSE
- ✅ Chat functionality works end-to-end

## Future Deployments

For future CDK deployments, you'll need to:
1. Run the CDK deployment
2. Manually store the new credentials using the script above

Or fix the environment variables in Vercel:
- Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel
- Redeploy and the automation will work