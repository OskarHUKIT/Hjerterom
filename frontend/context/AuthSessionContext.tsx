'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../app/lib/supabase'

export type AuthSessionContextValue = {
  user: User | null
  session: Session | null
  /** True after first `getSession` or `onAuthStateChange` has run */
  isReady: boolean
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)

/**
 * Single source for session/user + one `onAuthStateChange` subscription for the app shell.
 * Avoids duplicate listeners in Header / locale / push (each previously subscribed separately).
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    /**
     * Supabase legger ev. feil på `redirect_to` (eller Site URL når allowlist ikke matcher) som
     * ?error_code=...&error_description=... OG gjentar det i hash-fragmentet. Fang dette opp
     * tidlig slik at brukeren ikke bare lander på en stille forside.
     */
    if (typeof window !== 'undefined') {
      const parseParams = (raw: string) => new URLSearchParams(raw.startsWith('#') ? raw.slice(1) : raw)
      const q = parseParams(window.location.search)
      const h = parseParams(window.location.hash)
      const errorCode = q.get('error_code') || h.get('error_code')
      const errorDescription = q.get('error_description') || h.get('error_description')
      if (errorCode || errorDescription) {
        const reason = errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
          : errorCode || 'auth_error'
        const target = new URL('/auth/auth-code-error', window.location.origin)
        target.searchParams.set('reason', reason)
        window.location.replace(target.toString())
        return
      }

      /**
       * Supabase leverer av og til PKCE-koden rett til Site URL (f.eks. `/?code=...`) i stedet for
       * `/auth/callback` – typisk fordi Redirect URL-allowlisten ikke matcher. Når vi ser en `code`
       * i URL-en og ikke allerede er på auth-callback eller update-password, videresender vi til
       * `/auth/callback` (client-side page) som kan bytte koden inn i en sesjon med det
       * browserlagrede PKCE code_verifier og rute videre til `/login/update-password`.
       */
      const codeParam = q.get('code') || h.get('code')
      const authType = q.get('type') || h.get('type')
      const path = window.location.pathname
      if (
        codeParam &&
        !path.startsWith('/auth/callback') &&
        !path.startsWith('/login/update-password')
      ) {
        const target = new URL('/auth/callback', window.location.origin)
        target.searchParams.set('code', codeParam)
        /** Kun passord-reset skal ende på update-password; signup-bekreftelse bruker også `?code=`. */
        target.searchParams.set(
          'next',
          authType === 'recovery' ? '/login/update-password' : '/'
        )
        window.location.replace(target.toString())
        return
      }
    }

    void supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (cancelled) return
        setSession(s ?? null)
        setIsReady(true)
      })
      .catch(() => {
        if (!cancelled) setIsReady(true)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s ?? null)
      setIsReady(true)
      /**
       * Sikkerhetsnett for «glemt passord»-lenke: Supabase kan (avhengig av Redirect URL-allowlist
       * og klient-flow) sende brukeren til Site URL i stedet for /auth/callback. I så fall får vi
       * likevel en PASSWORD_RECOVERY-event når hash-/query-tokenet leses inn – send da videre til
       * skjemaet for å sette nytt passord.
       */
      if (
        event === 'PASSWORD_RECOVERY' &&
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login/update-password')
      ) {
        window.location.replace('/login/update-password')
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isReady,
    }),
    [session, isReady]
  )

  return (
    <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
  )
}

export function useAuthSession(): AuthSessionContextValue {
  const ctx = useContext(AuthSessionContext)
  if (!ctx) {
    throw new Error('useAuthSession must be used within AuthSessionProvider')
  }
  return ctx
}
