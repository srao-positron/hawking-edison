import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import ApiKeyManager from '@/components/ApiKeyManager'
import { createClient } from '@/lib/supabase-server'

export default async function ApiKeysPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  return <ApiKeyManager />
}