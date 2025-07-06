# GitHub Actions Secrets Setup

To enable automated deployment and testing via GitHub Actions, you need to set up the following secrets in your repository.

## Required Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

### Supabase Secrets
- `SUPABASE_ACCESS_TOKEN` - Your personal access token from https://supabase.com/dashboard/account/tokens
- `NEXT_PUBLIC_SUPABASE_URL` - https://bknpldydmkzupsfagnva.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your project's anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your project's service role key
- `SUPABASE_JWT_SECRET` - Your project's JWT secret
- `DATABASE_PASSWORD` - Your database password

### LLM API Keys
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `OPENAI_API_KEY` - Your OpenAI API key

## How to Find Your Supabase Keys

1. Go to https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/settings/api
2. You'll find:
   - Project URL
   - Anon key
   - Service role key

3. For JWT secret, check your local `.env.local` file

## Verify Setup

After adding all secrets:
1. Go to Actions tab
2. Run "Deploy Edge Functions" workflow manually
3. Check that all functions deploy successfully

## Local Development

For local deployment without GitHub Actions:
```bash
npm run deploy:functions
```

This uses the Supabase CLI with the `--use-api` flag to deploy without Docker.