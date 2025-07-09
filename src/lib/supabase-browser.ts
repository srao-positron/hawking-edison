// Browser-side Supabase client with proper cookie configuration
import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Override cookie options to set proper domain
        set(name: string, value: string, options: any) {
          const cookieOptions = {
            ...options,
            domain: process.env.NODE_ENV === 'production' ? '.hawkingedison.com' : undefined,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const
          }
          
          // Use document.cookie for browser
          const cookieString = `${name}=${value}; path=${cookieOptions.path || '/'}; ${
            cookieOptions.domain ? `domain=${cookieOptions.domain};` : ''
          } ${cookieOptions.secure ? 'secure;' : ''} ${
            cookieOptions.sameSite ? `samesite=${cookieOptions.sameSite};` : ''
          } ${cookieOptions.maxAge ? `max-age=${cookieOptions.maxAge};` : ''}`
          
          document.cookie = cookieString
        },
        get(name: string) {
          const value = `; ${document.cookie}`
          const parts = value.split(`; ${name}=`)
          if (parts.length === 2) {
            return parts.pop()?.split(';').shift()
          }
        },
        remove(name: string, options: any) {
          const cookieOptions = {
            ...options,
            domain: process.env.NODE_ENV === 'production' ? '.hawkingedison.com' : undefined,
            maxAge: 0
          }
          
          document.cookie = `${name}=; path=${cookieOptions.path || '/'}; ${
            cookieOptions.domain ? `domain=${cookieOptions.domain};` : ''
          } max-age=0`
        }
      }
    }
  )
}