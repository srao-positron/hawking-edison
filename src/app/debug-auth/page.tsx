'use client'

import { useAuth } from '@/hooks/useAuth'
import { getBrowserClient } from '@/lib/supabase-browser'
import { useEffect, useState } from 'react'

export default function DebugAuthPage() {
  const { user, loading, error } = useAuth()
  const [session, setSession] = useState<any>(null)
  const [authDebug, setAuthDebug] = useState<any>({})

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getBrowserClient()
      
      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      setSession(session)
      
      // Get user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      // Get auth state
      const authState = await supabase.auth.getSession()
      
      setAuthDebug({
        sessionData: session,
        sessionError,
        userData: user,
        userError,
        cookies: document.cookie,
        localStorage: Object.keys(localStorage).filter(k => k.includes('supabase')),
        authStateData: authState.data,
        authStateError: authState.error
      })
    }
    
    checkAuth()
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Page</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold">useAuth Hook</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify({ user, loading, error }, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold">Direct Session Check</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold">Auth Debug Info</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(authDebug, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold">Environment</h2>
          <pre className="text-sm overflow-auto">
            NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}
            NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(-8) : 'NOT SET'}
          </pre>
        </div>
      </div>
    </div>
  )
}