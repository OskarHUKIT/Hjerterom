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

/** True when URL carries a password-reset token (before or after verifyOtp). */
export function hasRecoveryTokenInUrl(searchParams?: URLSearchParams): boolean {
  if (typeof window === 'undefined') return false
  const q = searchParams ?? new URLSearchParams(window.location.search)
  if (q.get('token_hash')) return true
  if (q.get('type') === 'recovery' || q.get('recovery') === '1') return true
  const hash = parseAuthHashParams()
  if (hash.get('type') === 'recovery') return true
  if (hash.get('access_token') && hash.get('refresh_token')) return true
  return false
}

/** Paths where invalid refresh tokens must not redirect the user away mid-recovery. */
export function isAuthRecoveryRoute(pathname?: string): boolean {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '')
  if (path.startsWith('/auth/')) return true
  if (path.startsWith('/login/update-password')) return true
  if (path.startsWith('/login/forgot-password')) return true
  return false
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
  const code = searchParams.get('code')
  const hash = parseAuthHashParams()

  if (tokenHash) {
    /** Stale cookies can block verifyOtp — clear local session first. */
    await supabase.auth.signOut({ scope: 'local' })
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    })
    if (error) return { ok: false, error: error.message || 'verify_failed' }
    stripAuthParamsFromUrl()
    return { ok: true, via: 'token_hash' }
  }

  /** PKCE / server-side auth code on the reset redirect URL. */
  if (code && (isPasswordRecoveryUrl(searchParams) || searchParams.get('next') === '/login/update-password')) {
    await supabase.auth.signOut({ scope: 'local' })
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return { ok: false, error: error.message || 'exchange_failed' }
    stripAuthParamsFromUrl()
    return { ok: true, via: 'code' }
  }

  const { data: existing } = await supabase.auth.getSession()
  if (existing.session?.user && isPasswordRecoveryUrl(searchParams)) {
    stripAuthParamsFromUrl()
    return { ok: true, via: 'already' }
  }

  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  if (accessToken && refreshToken && hash.get('type') === 'recovery') {
    await supabase.auth.signOut({ scope: 'local' })
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) return { ok: false, error: error.message || 'set_session_failed' }
    stripAuthParamsFromUrl()
    return { ok: true, via: 'hash' }
  }

  return { ok: false, error: 'no_recovery_params' }
}

export function recoveryPasswordPageHref(): string {
  return '/login/update-password?recovery=1'
}
