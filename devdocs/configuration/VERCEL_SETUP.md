# Vercel Setup Instructions

Your repository is now connected to Vercel! 🎉

## Add Environment Variables

You need to add these environment variables in the Vercel dashboard:

1. Go to: https://vercel.com/hawking-edison/hawking-edison/settings/environment-variables

2. Add these variables for **Production**, **Preview**, and **Development**:

```
NEXT_PUBLIC_SUPABASE_URL=https://bknpldydmkzupsfagnva.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbnBsZHlkbWt6dXBzZmFnbnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc0ODYsImV4cCI6MjA2NzI3MzQ4Nn0.aMD9ip6-KSiH-pXsbhkpC1utVHgufc2v4PWrFmXW_cs
```

3. After adding them, click "Save"

4. Redeploy by going to the Deployments tab and clicking "Redeploy" on the latest deployment

## Your Deployment URLs

- **Production**: https://hawking-edison.vercel.app (or your custom domain)
- **Preview**: Each PR gets its own preview URL
- **Dashboard**: https://vercel.com/hawking-edison/hawking-edison

## GitHub Integration

Since you've connected the Git repository:
- Every push to `main` triggers a production deployment
- Every PR gets a preview deployment
- You can see deployment status in GitHub PRs

## Testing Authentication

Once deployed with environment variables:
1. Visit https://hawking-edison.vercel.app/auth/signup
2. Create an account
3. Check email for verification
4. Login at https://hawking-edison.vercel.app/auth/login

## Monitoring

- **Build Logs**: https://vercel.com/hawking-edison/hawking-edison/deployments
- **Function Logs**: Available in the Functions tab
- **Analytics**: Available in the Analytics tab

## Next Steps

1. Add the environment variables in Vercel dashboard
2. Redeploy to apply the variables
3. Test the authentication flow
4. Set up a custom domain (optional)

## Troubleshooting

If the build fails:
- Check the build logs in Vercel dashboard
- Ensure all environment variables are set
- Make sure the build command succeeds locally: `npm run build`

If authentication doesn't work:
- Verify environment variables are set correctly
- Check that Supabase URLs are accessible
- Look at browser console for errors