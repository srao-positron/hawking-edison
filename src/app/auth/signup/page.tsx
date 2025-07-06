'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TextInput, PasswordInput, Button, Paper, Title, Text, Container, Anchor, Alert, Progress, Box } from '@mantine/core'
import { signUp } from '@/lib/auth'

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 25
    if (password.match(/[0-9]/)) strength += 25
    if (password.match(/[^a-zA-Z0-9]/)) strength += 25
    return strength
  }

  const passwordStrength = getPasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password)

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
          <Title order={2} ta="center" mb="md">Check your email!</Title>
          <Alert color="green" mb="md">
            We've sent a verification link to {email}. Please check your email and click the link to verify your account.
          </Alert>
          <Text size="sm" c="dimmed" ta="center">
            Didn't receive the email? Check your spam folder or{' '}
            <Anchor onClick={() => setSuccess(false)}>try again</Anchor>.
          </Text>
        </Paper>
      </Container>
    )
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Create your account</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account?{' '}
        <Anchor size="sm" component={Link} href="/auth/login">
          Sign in
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
            type="email"
          />
          
          <PasswordInput
            label="Password"
            placeholder="Create a strong password"
            required
            mt="md"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            disabled={loading}
          />
          
          {password && (
            <Box mt="xs">
              <Text size="xs" c="dimmed" mb={5}>Password strength</Text>
              <Progress 
                value={passwordStrength} 
                color={passwordStrength < 50 ? 'red' : passwordStrength < 75 ? 'yellow' : 'green'}
                size="sm"
              />
            </Box>
          )}
          
          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            required
            mt="md"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            disabled={loading}
            error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : null}
          />
          
          <Button type="submit" fullWidth mt="xl" loading={loading}>
            Create account
          </Button>
          
          <Text size="xs" c="dimmed" mt="md" ta="center">
            By creating an account, you agree to our terms of service and privacy policy.
          </Text>
        </form>
      </Paper>
    </Container>
  )
}