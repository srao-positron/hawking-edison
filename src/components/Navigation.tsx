'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Group, Button, Container, Text } from '@mantine/core'
import { useAuth } from '@/hooks/useAuth'
import { IconHome, IconChecklist, IconLogin, IconLogout, IconUser, IconSettings } from '@tabler/icons-react'

export function Navigation() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <div style={{ borderBottom: '1px solid #eee', marginBottom: '2rem' }}>
      <Container size="lg" py="md">
        <Group justify="space-between">
          <Group>
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Text size="xl" fw={700}>Hawking Edison</Text>
            </Link>
            
            <Group ml="xl">
              <Button
                component={Link}
                href="/"
                variant={pathname === '/' ? 'filled' : 'subtle'}
                leftSection={<IconHome size={16} />}
                size="sm"
              >
                Home
              </Button>
              
              {user && (
                <>
                  <Button
                    component={Link}
                    href="/tasks"
                    variant={pathname === '/tasks' ? 'filled' : 'subtle'}
                    leftSection={<IconChecklist size={16} />}
                    size="sm"
                  >
                    Tasks
                  </Button>
                  <Button
                    component={Link}
                    href="/settings/api-keys"
                    variant={pathname.startsWith('/settings') ? 'filled' : 'subtle'}
                    leftSection={<IconSettings size={16} />}
                    size="sm"
                  >
                    Settings
                  </Button>
                </>
              )}
            </Group>
          </Group>

          <Group>
            {user ? (
              <>
                <Text size="sm" c="dimmed">
                  <IconUser size={14} style={{ display: 'inline', marginRight: 4 }} />
                  {user.email}
                </Text>
                <Button
                  onClick={handleSignOut}
                  variant="subtle"
                  leftSection={<IconLogout size={16} />}
                  size="sm"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  component={Link}
                  href="/auth/login"
                  variant="subtle"
                  leftSection={<IconLogin size={16} />}
                  size="sm"
                >
                  Login
                </Button>
                <Button
                  component={Link}
                  href="/auth/signup"
                  variant="filled"
                  size="sm"
                >
                  Sign Up
                </Button>
              </>
            )}
          </Group>
        </Group>
      </Container>
    </div>
  )
}