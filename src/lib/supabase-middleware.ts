// Supabase middleware utilities
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set cookies with domain .hawkingedison.com to work across all subdomains
            const cookieOptions = {
              ...options,
              domain: process.env.NODE_ENV === 'production' ? '.hawkingedison.com' : options?.domain,
              path: '/',
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax' as const,
              httpOnly: true
            }
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser()

  return supabaseResponse
}