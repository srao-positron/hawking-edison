# Manual Steps to Complete Setup

Since the vault-store Edge Function deployment is having issues, let's manually complete the setup.

## Step 1: Get AWS Credentials

The CDK has already created the AWS resources. You need to get:

1. **From AWS Console > CloudFormation > hawking-edison-dev > Outputs**:
   - `EdgeFunctionAccessKeyId` (starts with AKIA...)
   - `OrchestrationTopicArn` (arn:aws:sns:us-east-1:600771336675:...)

2. **From AWS Console > Secrets Manager**:
   - Search for `hawking-edison/edge-function-creds`
   - Click "Retrieve secret value"
   - Copy the `secretAccessKey`

## Step 2: Store in Vault

Once you have all three values, run:

```bash
npx tsx utils/quick-store-aws-creds.ts \
  <ACCESS_KEY_ID> \
  <SECRET_ACCESS_KEY> \
  us-east-1 \
  <TOPIC_ARN>
```

## Step 3: Verify

The system should now work end-to-end:
- Edge Functions can publish to SNS
- Lambda processes LLM requests
- Results stream back via SSE

## Alternative: Deploy vault-store via Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/functions)
2. Click "New Function"
3. Name: `vault-store`
4. Copy code from `supabase/functions/vault-store/index.ts`
5. Add secret: `VAULT_STORE_SERVICE_KEY` = `EY2LySQVi9ZOHzvKmkkMCR6sGCdc25G3KIO0oVzBbYM`
6. Deploy

Then re-run CDK deployment for full automation.