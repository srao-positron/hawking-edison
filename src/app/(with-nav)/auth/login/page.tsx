'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TextInput, PasswordInput, Button, Paper, Title, Text, Container, Group, Anchor, Alert } from '@mantine/core'
import { signIn } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/chat')
    }
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Welcome back!</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Do not have an account yet?{' '}
        <Anchor size="sm" component={Link} href="/auth/signup">
          Create account
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert color="red" mb="md">
              {error}
            </Alert>
          )}
          
          <TextInput
            label="Email"
            placeholder="your@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            disabled={loading}
          />
          
          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            mt="md"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            disabled={loading}
          />
          
          <Group justify="space-between" mt="lg">
            <Anchor component={Link} href="/auth/forgot-password" size="sm">
              Forgot password?
            </Anchor>
          </Group>
          
          <Button type="submit" fullWidth mt="xl" loading={loading}>
            Sign in
          </Button>
        </form>
      </Paper>
    </Container>
  )
}