'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, translations, TranslationKey } from '../lib/translations'
import { getAuthUserDeduped, supabase } from '../app/lib/supabase'
import { useAuthSession } from './AuthSessionContext'

type LanguageContextType = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
}

const defaultLocale: Locale = 'no'
const STORAGE_KEY = 'boly-locale'

const LanguageContext = createContext<LanguageContextType | null>(null)

function isLocale(x: string | null | undefined): x is Locale {
  return x === 'no' || x === 'se' || x === 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, isReady: authReady } = useAuthSession()
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [mounted, setMounted] = useState(false)

  /** One pass when auth is ready / user id changes — replaces getSession + separate onAuthStateChange. */
  useEffect(() => {
    if (!authReady) return
    let cancelled = false
    const init = async () => {
      const stored = localStorage.getItem(STORAGE_KEY)
      try {
        if (!user) {
          if (!cancelled && stored && isLocale(stored)) {
            setLocaleState(stored)
          }
          if (!cancelled) setMounted(true)
          return
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_locale')
          .eq('id', user.id)
          .maybeSingle()
        const meta = user.user_metadata?.preferred_locale
        const fromProfile =
          profile?.preferred_locale && isLocale(profile.preferred_locale)
            ? profile.preferred_locale
            : null
        const fromMeta = typeof meta === 'string' && isLocale(meta) ? meta : null
        const resolved = fromProfile ?? fromMeta
        if (!cancelled && resolved) {
          setLocaleState(resolved)
          localStorage.setItem(STORAGE_KEY, resolved)
          setMounted(true)
          return
        }
        if (!cancelled && stored && isLocale(stored)) {
          setLocaleState(stored)
        }
      } catch {
        if (!cancelled && stored && isLocale(stored)) {
          setLocaleState(stored)
        }
      } finally {
        if (!cancelled) setMounted(true)
      }
    }
    void init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `user?.id` only; avoid locale refetch on token refresh
  }, [authReady, user?.id])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, l)
      document.documentElement.lang = l === 'no' ? 'nb' : l === 'se' ? 'se' : 'en'
    }
    void (async () => {
      const u = await getAuthUserDeduped()
      if (!u) return
      await supabase.from('profiles').update({ preferred_locale: l }).eq('id', u.id)
      await supabase.auth.updateUser({ data: { preferred_locale: l } })
    })()
  }

  useEffect(() => {
    if (mounted && typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'no' ? 'nb' : locale === 'se' ? 'se' : 'en'
    }
  }, [locale, mounted])

  const t = (key: TranslationKey): string =>
    translations[locale][key] ?? translations.no[key] ?? key

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>
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
