'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { supabase } from '../app/lib/supabase'

type Theme = 'dark' | 'light'

/** Gammel global nøkkel – migreres én gang til innlogget bruker, deretter slettes. */
export const THEME_STORAGE_KEY_LEGACY = 'boly-theme'

export function themeStorageKeyForUser(userId: string) {
  return `boly-theme:${userId}`
}

function readThemeForUserId(userId: string | null): Theme {
  if (typeof window === 'undefined') return 'dark'
  if (!userId) return 'dark'
  try {
    const key = themeStorageKeyForUser(userId)
    const own = localStorage.getItem(key)
    if (own === 'light' || own === 'dark') return own
    const legacy = localStorage.getItem(THEME_STORAGE_KEY_LEGACY)
    if (legacy === 'light' || legacy === 'dark') {
      localStorage.setItem(key, legacy)
      localStorage.removeItem(THEME_STORAGE_KEY_LEGACY)
      return legacy
    }
  } catch (_) {
    /* ignore */
  }
  return 'dark'
}

type ThemeContextType = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  /** True når bruker er innlogget – da kan tema lagres og byttes. */
  themePreferenceEnabled: boolean
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const userIdRef = useRef<string | null>(null)
  const [themePreferenceEnabled, setThemePreferenceEnabled] = useState(false)

  const applyForUser = useCallback((userId: string | null) => {
    userIdRef.current = userId
    const next = readThemeForUserId(userId)
    setThemePreferenceEnabled(!!userId)
    setThemeState(next)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      applyForUser(session?.user?.id ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyForUser(session?.user?.id ?? null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [applyForUser])

  const setTheme = useCallback((t: Theme) => {
    const uid = userIdRef.current
    if (!uid) {
      setThemeState('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
      return
    }
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
    try {
      localStorage.setItem(themeStorageKeyForUser(uid), t)
    } catch (_) {
      /* ignore */
    }
  }, [])

  const toggleTheme = useCallback(() => {
    if (!userIdRef.current) return
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themePreferenceEnabled }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return {
      theme: 'dark' as Theme,
      setTheme: () => {},
      toggleTheme: () => {},
      themePreferenceEnabled: false,
    }
  }
  return ctx
}
