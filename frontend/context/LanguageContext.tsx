'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, translations, TranslationKey } from '../lib/translations'

type LanguageContextType = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
}

const defaultLocale: Locale = 'no'
const STORAGE_KEY = 'boly-locale'

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && (stored === 'no' || stored === 'se' || stored === 'en')) {
      setLocaleState(stored as Locale)
    }
    setMounted(true)
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, l)
      document.documentElement.lang = l === 'no' ? 'nb' : l === 'se' ? 'se' : 'en'
    }
  }

  useEffect(() => {
    if (mounted && typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'no' ? 'nb' : locale === 'se' ? 'se' : 'en'
    }
  }, [locale, mounted])

  const t = (key: TranslationKey): string => translations[locale][key] ?? translations.no[key] ?? key

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    return {
      locale: defaultLocale as Locale,
      setLocale: () => {},
      t: (key: TranslationKey) => translations.no[key] ?? key,
    }
  }
  return ctx
}
