# Supabase Cookie Configuration for Subdomains

## Architecture
- **App**: `hawkingedison.com`
- **Supabase + Edge Functions**: `service.hawkingedison.com`
- **APIs**: All implemented as Supabase Edge Functions (not Next.js routes)

## Cookie Configuration
Since both domains share the same parent (`hawkingedison.com`), cookies can be shared with proper configuration:

### 1. In Supabase Dashboard
Go to Settings > Auth > Cookie Settings and set:
- Cookie Domain: `.hawkingedison.com` (note the leading dot)
- Cookie SameSite: `lax`
- Cookie Secure: `true` (for HTTPS)

### 2. Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://service.hawkingedison.com
```

### 3. API Architecture
All APIs are implemented as Supabase Edge Functions:
- `/functions/v1/interact` - Main orchestration endpoint
- `/functions/v1/auth-api-keys` - API key management
- `/functions/v1/databank` - Knowledge management
- `/functions/v1/memories` - Agent memory
- `/functions/v1/chat-threads` - Thread management

The browser calls these endpoints directly at `service.hawkingedison.com`.

### 4. Authentication Flow
1. User logs in via Supabase Auth
2. Cookies are set with domain `.hawkingedison.com`
3. Both `hawkingedison.com` and `service.hawkingedison.com` can access the cookies
4. Edge Functions verify auth using the shared auth utilities

### 5. Testing
You can verify cookies are set correctly by:
1. Log in to the app
2. Open DevTools > Application > Cookies
3. Check that cookies have domain=`.hawkingedison.com`
4. Verify both domains can access the same session

### 6. Security Considerations
- Cookies shared across subdomains use Secure and HttpOnly flags
- SameSite=lax prevents CSRF attacks
- All subdomains use HTTPS
- Edge Functions verify authentication before processing requests