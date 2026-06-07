import type { SupabaseClient } from '@supabase/supabase-js'

/** Hash-fragment from Supabase implicit auth redirects (`#access_token=...&type=recovery`). */
export function parseAuthHashParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams()
  const raw = window.location.hash.replace(/^#/, '')
  return raw ? new URLSearchParams(raw) : new URLSearchParams()
}

export function isPasswordRecoveryUrl(searchParams: URLSearchParams): boolean {
  if (searchParams.get('recovery') === '1') return true
  if (searchParams.get('type') === 'recovery') return true
  return parseAuthHashParams().get('type') === 'recovery'
}

function stripAuthParamsFromUrl() {
  if (typeof window === 'undefined') return
  const path = window.location.pathname
  const keepRecovery = path.startsWith('/login/update-password') ? '?recovery=1' : ''
  window.history.replaceState({}, '', `${path}${keepRecovery}`)
}

export type RecoverySessionResult =
  | { ok: true; via: 'token_hash' | 'code' | 'hash' | 'already' }
  | { ok: false; error: string }

/**
 * Establish a password-recovery session from URL params (email link).
 * Safe to call on `/login/update-password` and `/auth/callback`.
 */
export async function establishRecoverySessionFromUrl(
  supabase: SupabaseClient,
  searchParams: URLSearchParams
): Promise<RecoverySessionResult> {
  const tokenHash = searchParams.get('token_hash')
  const otpType = searchParams.get('type')
  const code = searchParams.get('code')
  const hash = parseAuthHashParams()

  if (tokenHash && otpType === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    })
    if (error) return { ok: false, error: error.message || 'verify_failed' }
    stripAuthParamsFromUrl()
    return { ok: true, via: 'token_hash' }
  }

  /** PKCE / server-side auth code on the reset redirect URL. */
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return { ok: false, error: error.message || 'exchange_failed' }
    stripAuthParamsFromUrl()
    return { ok: true, via: 'code' }
  }

  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  if (accessToken && refreshToken && hash.get('type') === 'recovery') {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) return { ok: false, error: error.message || 'set_session_failed' }
    stripAuthParamsFromUrl()
    return { ok: true, via: 'hash' }
  }

  const { data } = await supabase.auth.getSession()
  if (data.session?.user && isPasswordRecoveryUrl(searchParams)) {
    return { ok: true, via: 'already' }
  }

  return { ok: false, error: 'no_recovery_params' }
}

export function recoveryPasswordPageHref(): string {
  return '/login/update-password?recovery=1'
}
