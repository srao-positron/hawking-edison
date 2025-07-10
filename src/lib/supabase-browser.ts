// Browser-side Supabase client with proper cookie handling
import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'

// Helper to parse cookies properly
function parseCookieString(str: string): { [key: string]: string } {
  const cookies: { [key: string]: string } = {}
  
  if (!str) return cookies
  
  str.split(';').forEach(cookie => {
    const parts = cookie.split('=')
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const value = parts.slice(1).join('=').trim() // Handle values with '=' in them
      if (key) {
        cookies[decodeURIComponent(key)] = decodeURIComponent(value)
      }
    }
  })
  
  return cookies
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookies = parseCookieString(document.cookie)
          return cookies[name]
        },
        set(name: string, value: string, options?: any) {
          let cookieString = `${name}=${value}`
          
          if (options?.maxAge) {
            cookieString += `; Max-Age=${options.maxAge}`
          }
          if (options?.expires) {
            cookieString += `; Expires=${options.expires.toUTCString()}`
          }
          
          cookieString += `; Path=/`
          cookieString += `; SameSite=lax`
          
          document.cookie = cookieString
        },
        remove(name: string) {
          document.cookie = `${name}=; Max-Age=0; Path=/`
        }
      }
    }
  )
}

// Don't use singleton - create new instance each time to ensure fresh cookies
export function getBrowserClient() {
  return createClient()
}