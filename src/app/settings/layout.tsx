import Link from 'next/link'
import { Key, User, CreditCard, Shield } from 'lucide-react'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        
        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="w-64 flex-shrink-0">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/settings/profile"
                  className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-gray-100 text-gray-700"
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
              </li>
              <li>
                <Link
                  href="/settings/api-keys"
                  className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-gray-100 text-gray-700"
                >
                  <Key className="w-4 h-4" />
                  API Keys
                </Link>
              </li>
              <li>
                <Link
                  href="/settings/billing"
                  className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-gray-100 text-gray-700"
                >
                  <CreditCard className="w-4 h-4" />
                  Billing
                </Link>
              </li>
              <li>
                <Link
                  href="/settings/security"
                  className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-gray-100 text-gray-700"
                >
                  <Shield className="w-4 h-4" />
                  Security
                </Link>
              </li>
            </ul>
          </nav>
          
          {/* Content */}
          <main className="flex-1 bg-white rounded-lg shadow">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}