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

/** Legacy global key — migrated once to per-user storage, then removed. */
export const THEME_STORAGE_KEY_LEGACY = 'boly-theme'
export const THEME_STORAGE_KEY_GUEST = 'boly-theme-guest'

export function themeStorageKeyForUser(userId: string) {
  return `boly-theme:${userId}`
}

function isTheme(x: string | null | undefined): x is Theme {
  return x === 'dark' || x === 'light'
}

function readThemeForUserId(userId: string | null): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    if (!userId) {
      const guest = localStorage.getItem(THEME_STORAGE_KEY_GUEST)
      if (isTheme(guest)) return guest
      return 'dark'
    }
    const key = themeStorageKeyForUser(userId)
    const own = localStorage.getItem(key)
    if (isTheme(own)) return own
    const legacy = localStorage.getItem(THEME_STORAGE_KEY_LEGACY)
    if (isTheme(legacy)) {
      localStorage.setItem(key, legacy)
      localStorage.removeItem(THEME_STORAGE_KEY_LEGACY)
      return legacy
    }
  } catch (_) {
    /* ignore */
  }
  return 'dark'
}

function persistTheme(userId: string | null, theme: Theme) {
  try {
    if (userId) {
      localStorage.setItem(themeStorageKeyForUser(userId), theme)
    } else {
      localStorage.setItem(THEME_STORAGE_KEY_GUEST, theme)
    }
  } catch (_) {
    /* ignore */
  }
}

type ThemeContextType = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  /** Always true — guests and logged-in users can switch theme (PRD §15.2). */
  themePreferenceEnabled: boolean
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const userIdRef = useRef<string | null>(null)

  const applyTheme = useCallback((next: Theme) => {
    setThemeState(next)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next)
      document.documentElement.style.colorScheme = next
    }
  }, [])

  const applyForUser = useCallback(
    async (userId: string | null) => {
      userIdRef.current = userId
      if (!userId) {
        applyTheme(readThemeForUserId(null))
        return
      }
      let resolved = readThemeForUserId(userId)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_theme')
          .eq('id', userId)
          .maybeSingle()
        if (isTheme(profile?.preferred_theme)) {
          resolved = profile.preferred_theme
          persistTheme(userId, resolved)
        }
      } catch (_) {
        /* profile fetch optional */
      }
      applyTheme(resolved)
    },
    [applyTheme]
  )

  useEffect(() => {
    let cancelled = false

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return
        void applyForUser(session?.user?.id ?? null)
      })
      .catch(() => {
        if (cancelled) return
        void applyForUser(null)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyForUser(session?.user?.id ?? null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [applyForUser])

  const setTheme = useCallback(
    (t: Theme) => {
      const uid = userIdRef.current
      applyTheme(t)
      persistTheme(uid, t)
      if (uid) {
        void supabase.from('profiles').update({ preferred_theme: t }).eq('id', uid)
      }
    },
    [applyTheme]
  )

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
