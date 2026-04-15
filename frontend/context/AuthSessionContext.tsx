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
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null)
      setIsReady(true)
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
