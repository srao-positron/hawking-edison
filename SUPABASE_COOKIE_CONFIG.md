# Supabase Cookie Configuration for Subdomains

## Problem
When Supabase is hosted on `service.hawkingedison.com` and the app is on `hawkingedison.com`, cookies set by Supabase are not accessible to the main app by default.

## Solution
Configure Supabase to set cookies with the parent domain:

### 1. In Supabase Dashboard
Go to Settings > Auth > Cookie Settings and set:
- Cookie Domain: `.hawkingedison.com` (note the leading dot)
- Cookie SameSite: `lax`
- Cookie Secure: `true` (for HTTPS)

### 2. Environment Variables
Ensure your Supabase URL uses the custom domain:
```
NEXT_PUBLIC_SUPABASE_URL=https://service.hawkingedison.com
```

### 3. Current Workaround
Until Supabase cookies are properly configured, we use a session proxy:
- `/api/auth/session` - Returns the current session from server-side cookies
- The API client fetches the session from this endpoint instead of directly from Supabase

### 4. Testing
You can verify cookies are set correctly by:
1. Log in to the app
2. Open DevTools > Application > Cookies
3. Check that cookies have domain=`.hawkingedison.com`

### 5. Security Considerations
- Cookies shared across subdomains should use Secure and HttpOnly flags
- Use SameSite=lax to prevent CSRF attacks
- Ensure all subdomains use HTTPS