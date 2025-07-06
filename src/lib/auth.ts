// Authentication utilities for client-side
import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

export interface AuthError {
  message: string
  code?: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: AuthError | null
}

// Sign up with email
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  })

  if (error) {
    return { error: { message: error.message, code: error.code } }
  }

  return { data }
}

// Sign in with email
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return { error: { message: error.message, code: error.code } }
  }

  return { data }
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: { message: error.message, code: error.code } }
  }

  return { success: true }
}

// Get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    return { error: { message: error.message, code: error.code } }
  }

  return { user }
}

// Reset password
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  })

  if (error) {
    return { error: { message: error.message, code: error.code } }
  }

  return { success: true }
}

// Update password
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) {
    return { error: { message: error.message, code: error.code } }
  }

  return { success: true }
}

// Resend verification email
export async function resendVerificationEmail(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  })

  if (error) {
    return { error: { message: error.message, code: error.code } }
  }

  return { success: true }
}

// Check if user email is verified
export function isEmailVerified(user: User | null): boolean {
  if (!user) return false
  return user.email_confirmed_at !== null
}