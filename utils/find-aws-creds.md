# Finding AWS Credentials for Vault Storage

The CDK deployment partially succeeded and created AWS resources. You need to retrieve the credentials to store them in Vault.

## Option 1: AWS Secrets Manager (Recommended)

1. Go to [AWS Console](https://console.aws.amazon.com)
2. Navigate to **Secrets Manager**
3. Search for: `hawking-edison/edge-function-creds`
4. Click on the secret
5. Click "Retrieve secret value"
6. You'll see JSON with:
   ```json
   {
     "accessKeyId": "AKIA...",
     "secretAccessKey": "...",
     "region": "us-east-1",
     "topicArn": "arn:aws:sns:us-east-1:600771336675:hawking-edison-dev-orchestration"
   }
   ```

## Option 2: CloudFormation Outputs

1. Go to [AWS Console](https://console.aws.amazon.com)
2. Navigate to **CloudFormation**
3. Find stack: `hawking-edison-dev`
4. Click on the **Outputs** tab
5. Look for:
   - EdgeFunctionAccessKeyId
   - EdgeFunctionSecretAccessKey (might be hidden)
   - OrchestrationTopicArn
   - Region (should be us-east-1)

## Option 3: IAM User

1. Go to **IAM** > **Users**
2. Search for a user like `hawking-edison-dev-EdgeFunctionUser...`
3. Go to **Security credentials** tab
4. The access key should be listed there
5. For the secret, check Secrets Manager (Option 1)

## Once You Have the Credentials

Run this command with the actual values:

```bash
npx tsx utils/quick-store-aws-creds.ts <ACCESS_KEY_ID> <SECRET_ACCESS_KEY> us-east-1 <TOPIC_ARN>
```

Example:
```bash
npx tsx utils/quick-store-aws-creds.ts AKIAIOSFODNN7EXAMPLE wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY us-east-1 arn:aws:sns:us-east-1:600771336675:hawking-edison-dev-orchestration
```

This will store the credentials in Vault, and the Edge Functions will automatically use them!