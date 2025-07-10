# Manual Deployment of vault-store Edge Function

Since the Supabase CLI is hanging, deploy the Edge Function manually:

## Step 1: Go to Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/bknpldydmkzupsfagnva)
2. Navigate to **Edge Functions**
3. Click **New Function**

## Step 2: Create the Function

- **Name**: `vault-store`
- **Copy the code from**: `supabase/functions/vault-store/index.ts`

## Step 3: Set Environment Variable

In the Edge Function settings, add:
- **Key**: `VAULT_STORE_SERVICE_KEY`
- **Value**: `EY2LySQVi9ZOHzvKmkkMCR6sGCdc25G3KIO0oVzBbYM`

## Step 4: Deploy

Click **Deploy** to make the function live.

## Step 5: Test the Automation

Once deployed, run the CDK deployment again:

```bash
cd infrastructure/cdk && ./deploy.sh
```

This time it should work because:
1. ✅ Vault migration is applied
2. ✅ Edge Function is deployed
3. ✅ Lambda can call the Edge Function
4. ✅ Credentials will be stored automatically

## What This Achieves

- **Automatic credential updates** - Every CDK deployment updates Vault
- **No manual steps** - Lambda calls Edge Function during deployment
- **Secure** - Service key authentication prevents unauthorized access
- **Works from anywhere** - Lambda doesn't need VPC or special networking