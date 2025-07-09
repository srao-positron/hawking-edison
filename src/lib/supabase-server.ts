// Server-side Supabase client for App Router
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import { Database } from './database.types'

export function createClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Set cookies with domain .hawkingedison.com in production
              const cookieOptions = {
                ...options,
                domain: process.env.NODE_ENV === 'production' ? '.hawkingedison.com' : options?.domain,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax' as const,
                httpOnly: true
              }
              cookieStore.set(name, value, cookieOptions)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}