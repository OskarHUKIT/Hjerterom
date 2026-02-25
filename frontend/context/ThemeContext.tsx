'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'dark' | 'light'
const STORAGE_KEY = 'boly-theme'

type ThemeContextType = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored)
      document.documentElement.setAttribute('data-theme', stored)
    }
    setMounted(true)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, t)
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme, mounted])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
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
    }
  }
  return ctx
}
