'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function TestAuthPage() {
  const [status, setStatus] = useState<string[]>([])
  
  const addStatus = (msg: string) => {
    setStatus(prev => [...prev, `${new Date().toISOString()}: ${msg}`])
  }
  
  const testAuth = async () => {
    setStatus([])
    addStatus('Starting auth test...')
    
    try {
      // Create a fresh client
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      addStatus('Created Supabase client')
      
      // Try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'siddhartha.s.rao@gmail.com',
        password: 'Ctigroup1@'
      })
      
      if (error) {
        addStatus(`Login error: ${error.message}`)
        return
      }
      
      addStatus(`Login successful! User: ${data.user?.email}`)
      addStatus(`Session exists: ${!!data.session}`)
      
      // Check if we can get the session
      const { data: sessionData } = await supabase.auth.getSession()
      addStatus(`Session check: ${sessionData.session ? 'Found' : 'Not found'}`)
      
      // Check cookies
      addStatus('Cookies: ' + document.cookie.split(';').filter(c => c.includes('supabase')).join('; '))
      
      // Try navigating
      addStatus('Attempting navigation to /chat...')
      setTimeout(() => {
        window.location.href = '/chat'
      }, 1000)
      
    } catch (err: any) {
      addStatus(`Error: ${err.message}`)
    }
  }
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      
      <button
        onClick={testAuth}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Test Authentication
      </button>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Status:</h2>
        <pre className="text-sm whitespace-pre-wrap">
          {status.join('\n')}
        </pre>
      </div>
    </div>
  )
}