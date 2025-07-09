// Browser-side Supabase client with proper cookie handling
import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // In production, ensure cookies work across subdomains
        get(name: string) {
          // Get cookie value
          const value = document.cookie
            .split('; ')
            .find(row => row.startsWith(name + '='))
            ?.split('=')[1]
          
          return value || null
        },
        set(name: string, value: string, options?: any) {
          // Set cookie with proper domain for production
          let cookieString = `${name}=${value}`
          
          if (options?.maxAge) {
            cookieString += `; Max-Age=${options.maxAge}`
          }
          if (options?.expires) {
            cookieString += `; Expires=${options.expires.toUTCString()}`
          }
          if (options?.path) {
            cookieString += `; Path=${options.path}`
          }
          
          // In production, set domain to .hawkingedison.com for cross-subdomain access
          if (process.env.NODE_ENV === 'production') {
            cookieString += '; Domain=.hawkingedison.com'
            cookieString += '; Secure'
          }
          
          cookieString += '; SameSite=Lax'
          
          document.cookie = cookieString
        },
        remove(name: string, options?: any) {
          // Remove cookie
          let cookieString = `${name}=; Max-Age=0`
          
          if (options?.path) {
            cookieString += `; Path=${options.path}`
          }
          
          // In production, ensure we remove from the correct domain
          if (process.env.NODE_ENV === 'production') {
            cookieString += '; Domain=.hawkingedison.com'
          }
          
          document.cookie = cookieString
        }
      }
    }
  )
}

// Export a singleton instance for the browser
let browserClient: ReturnType<typeof createClient> | undefined

export function getBrowserClient() {
  if (!browserClient && typeof window !== 'undefined') {
    browserClient = createClient()
  }
  return browserClient!
}