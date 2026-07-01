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
import { useAuthSession } from './AuthSessionContext'

type Theme = 'dark' | 'light'

/** Legacy global key — migrated once to per-user storage, then removed. */
export const THEME_STORAGE_KEY_LEGACY = 'boly-theme'

/** Guest theme persistence (PRD §15.2). */
export const THEME_STORAGE_KEY_GUEST = 'boly-theme-guest'

export function themeStorageKeyForUser(userId: string) {
  return `boly-theme:${userId}`
}

function isTheme(x: string | null | undefined): x is Theme {
  return x === 'dark' || x === 'light'
}

function readGuestTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const guest = localStorage.getItem(THEME_STORAGE_KEY_GUEST)
    if (isTheme(guest)) return guest
    const legacy = localStorage.getItem(THEME_STORAGE_KEY_LEGACY)
    if (isTheme(legacy)) {
      localStorage.setItem(THEME_STORAGE_KEY_GUEST, legacy)
      localStorage.removeItem(THEME_STORAGE_KEY_LEGACY)
      return legacy
    }
  } catch {
    /* ignore */
  }
  return 'dark'
}

function readThemeFromUserLocalStorage(userId: string): Theme | null {
  if (typeof window === 'undefined') return null
  try {
    const own = localStorage.getItem(themeStorageKeyForUser(userId))
    if (isTheme(own)) return own
    const legacy = localStorage.getItem(THEME_STORAGE_KEY_LEGACY)
    if (isTheme(legacy)) {
      localStorage.setItem(themeStorageKeyForUser(userId), legacy)
      localStorage.removeItem(THEME_STORAGE_KEY_LEGACY)
      return legacy
    }
  } catch {
    /* ignore */
  }
  return null
}

function applyThemeToDocument(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

type ThemeContextType = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  /** Always true — guests and logged-in users can choose theme (PRD §15.2). */
  themePreferenceEnabled: boolean
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, isReady: authReady } = useAuthSession()
  const [theme, setThemeState] = useState<Theme>('dark')
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!authReady) return
    let cancelled = false

    const init = async () => {
      const uid = user?.id ?? null
      userIdRef.current = uid

      if (!uid) {
        const guestTheme = readGuestTheme()
        if (!cancelled) {
          setThemeState(guestTheme)
          applyThemeToDocument(guestTheme)
        }
        return
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_theme')
          .eq('id', uid)
          .maybeSingle()

        const fromProfile = isTheme(profile?.preferred_theme) ? profile.preferred_theme : null
        const fromLocal = readThemeFromUserLocalStorage(uid)
        const resolved = fromProfile ?? fromLocal ?? 'dark'

        if (!cancelled) {
          setThemeState(resolved)
          applyThemeToDocument(resolved)
          try {
            localStorage.setItem(themeStorageKeyForUser(uid), resolved)
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!cancelled) {
          const fallback = readThemeFromUserLocalStorage(uid) ?? 'dark'
          setThemeState(fallback)
          applyThemeToDocument(fallback)
        }
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [authReady, user?.id])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    applyThemeToDocument(t)

    const uid = userIdRef.current
    try {
      if (!uid) {
        localStorage.setItem(THEME_STORAGE_KEY_GUEST, t)
        return
      }
      localStorage.setItem(themeStorageKeyForUser(uid), t)
      void supabase.from('profiles').update({ preferred_theme: t }).eq('id', uid)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, themePreferenceEnabled: true }}
    >
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
      themePreferenceEnabled: true,
    }
  }
  return ctx
}
