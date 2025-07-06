# Supabase Email Configuration

## Quick Fix - Update Site URL

1. Go to: https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/auth/url-configuration

2. Update these settings:
   - **Site URL**: `https://hawking-edison.vercel.app`
   - **Redirect URLs**: 
     - `https://hawking-edison.vercel.app/*`
     - `http://localhost:3000/*`

3. Save changes

This will make all email templates use your production URL automatically.

## Manual Template Updates (if needed)

If the above doesn't work, manually update each template:

1. Go to: https://supabase.com/dashboard/project/bknpldydmkzupsfagnva/auth/templates

2. For each template, replace:
   - `{{ .SiteURL }}` → `https://hawking-edison.vercel.app`
   - `localhost:3000` → `https://hawking-edison.vercel.app`

### Templates to Update:
- Confirm signup
- Invite user  
- Magic Link
- Change Email Address
- Reset Password

## Testing

After updating:
1. Sign up with a new email at https://hawking-edison.vercel.app/auth/signup
2. Check that the verification email links to `hawking-edison.vercel.app` not `localhost:3000`
3. Click the link and verify it works

## Environment-Specific URLs

For a more robust solution, you might want to:
- Use `{{ .SiteURL }}` in templates
- Set different Site URLs for different environments
- This way local development uses localhost, production uses Vercel

## Troubleshooting

If emails still go to localhost:
1. Clear your browser cache
2. Check you saved the Supabase settings
3. Try a completely new email address
4. Check the email source to see the actual link