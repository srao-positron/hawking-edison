import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Key, Server, ChevronRight } from 'lucide-react'

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const settingsOptions = [
    {
      title: 'API Keys',
      description: 'Manage your API keys for programmatic access',
      href: '/settings/api-keys',
      icon: Key,
    },
    {
      title: 'MCP Servers',
      description: 'Connect external tools and data sources via Model Context Protocol',
      href: '/settings/mcp-servers',
      icon: Server,
    },
  ]
  
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
      
      <div className="grid gap-4">
        {settingsOptions.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                  <option.icon className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {option.title}
                  </h3>
                  <p className="text-gray-600">
                    {option.description}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}