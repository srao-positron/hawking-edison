'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TextInput, Button, Paper, Title, Text, Container, Anchor, Alert } from '@mantine/core'
import { resetPassword } from '@/lib/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await resetPassword(email)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <Container size={420} my={40}>
        <Paper withBorder shadow="md" p={30} radius="md">
          <Title order={2} ta="center" mb="md">Check your email</Title>
          <Alert color="green" mb="md">
            We've sent a password reset link to {email}. Please check your email and follow the instructions.
          </Alert>
          <Text size="sm" c="dimmed" ta="center">
            Didn't receive the email? Check your spam folder or{' '}
            <Anchor onClick={() => { setSuccess(false); setError(null); }}>
              try again
            </Anchor>
            .
          </Text>
          <Button
            component={Link}
            href="/auth/login"
            variant="subtle"
            fullWidth
            mt="md"
          >
            Back to login
          </Button>
        </Paper>
      </Container>
    )
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Reset your password</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Enter your email address and we'll send you a link to reset your password.
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
            type="email"
          />
          
          <Button type="submit" fullWidth mt="xl" loading={loading}>
            Send reset link
          </Button>
          
          <Text ta="center" mt="md">
            <Anchor component={Link} href="/auth/login" size="sm">
              Back to login
            </Anchor>
          </Text>
        </form>
      </Paper>
    </Container>
  )
}