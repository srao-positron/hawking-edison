# Add VAULT_STORE_SERVICE_KEY to Vercel

The Lambda is getting 401 Unauthorized because Vercel doesn't have the VAULT_STORE_SERVICE_KEY environment variable.

## Steps to Add:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the `hawking-edison` project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Key**: `VAULT_STORE_SERVICE_KEY`
   - **Value**: `EY2LySQVi9ZOHzvKmkkMCR6sGCdc25G3KIO0oVzBbYM`
   - **Environment**: All (Production, Preview, Development)
5. Click **Save**

## Alternative: Add to GitHub Secrets

If Vercel is pulling from GitHub secrets:
1. Go to GitHub repo settings
2. Add secret: `VAULT_STORE_SERVICE_KEY`
3. Value: `EY2LySQVi9ZOHzvKmkkMCR6sGCdc25G3KIO0oVzBbYM`

## After Adding:

1. Trigger a new deployment on Vercel (or wait for it to auto-deploy)
2. Test the endpoint works:
   ```bash
   curl https://hawking-edison.vercel.app/api/vault-store-test
   ```
3. Run CDK deployment again

The Lambda should then be able to successfully call the Vercel proxy!