import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthResponse } from '@supabase/supabase-js'

export type SignUpOutcome =
  | { kind: 'created_needs_confirm' }
  | { kind: 'created_signed_in' }
  | { kind: 'resend_confirmation' }
  | { kind: 'signed_in_existing' }
  | { kind: 'email_taken' }
  | { kind: 'failed'; message: string }

function hasEmailIdentity(user: AuthResponse['data']['user']): boolean {
  const identities = user?.identities ?? []
  return identities.some((i) => i.provider === 'email')
}

/**
 * Interpret Supabase signUp — which returns `{ error: null }` even when no user was
 * created (anti-enumeration: `identities: []` for existing emails).
 */
export async function resolveEmailSignUpOutcome(
  supabase: SupabaseClient,
  signUpData: AuthResponse['data'],
  signUpError: AuthResponse['error'],
  credentials: { email: string; password: string },
  emailRedirectTo: string
): Promise<SignUpOutcome> {
  if (signUpError) {
    return { kind: 'failed', message: signUpError.message || 'signup_failed' }
  }

  const user = signUpData.user
  if (!user) {
    return { kind: 'failed', message: 'signup_no_user' }
  }

  if (hasEmailIdentity(user)) {
    if (signUpData.session) {
      return { kind: 'created_signed_in' }
    }
    return { kind: 'created_needs_confirm' }
  }

  /**
   * No new identity — email already registered (or reserved after soft delete).
   * Try sign-in with the password they just entered; if the account exists but is
   * unconfirmed, resend confirmation instead of showing a misleading success banner.
   */
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: credentials.email.trim(),
    password: credentials.password,
  })

  if (!signInError && signInData.session) {
    return { kind: 'signed_in_existing' }
  }

  const signInMsg = (signInError?.message || '').toLowerCase()
  if (
    signInMsg.includes('email not confirmed') ||
    signInMsg.includes('not confirmed') ||
    signInMsg.includes('email_not_confirmed')
  ) {
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: credentials.email.trim(),
      options: { emailRedirectTo },
    })
    if (!resendError) {
      return { kind: 'resend_confirmation' }
    }
  }

  return { kind: 'email_taken' }
}
