# Debugging Vault Lambda Failure

The CDK deployment is failing at the custom resource step where the Lambda tries to store credentials in Vault.

## Error Details
- Custom Resource: `StoreCredsInVault` 
- Lambda Function: `VaultCredentialManager`
- Error: `Received response status [FAILED]`
- CloudWatch Log Stream: `2025/07/09/[$LATEST]2ed4d38f375644f9aa67526d76b1fa64`

## Likely Issues

1. **Lambda can't reach Supabase** - The Lambda might not have internet access or the Supabase URL/key might not be passed correctly
2. **Environment variables missing** - The Lambda needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
3. **Network/VPC issues** - Lambda might be in a VPC without internet access

## To Check CloudWatch Logs

1. Go to AWS Console > CloudWatch > Log Groups
2. Find `/aws/lambda/hawking-edison-dev-VaultCredentialManager...`
3. Look at the latest log stream for the actual error

## Quick Fix Options

Since the infrastructure is mostly deployed and we've already applied the Vault migration manually, we can:

1. **Skip the automation** - Just manually store the credentials using our script
2. **Fix and redeploy** - Update the Lambda to handle errors better
3. **Check Lambda environment** - Ensure it has the right environment variables

The manual approach is fastest since everything else is working.