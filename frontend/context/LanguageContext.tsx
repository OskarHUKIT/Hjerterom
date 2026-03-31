'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, translations, TranslationKey } from '../lib/translations'
import { supabase } from '../app/lib/supabase'

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
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const stored = localStorage.getItem(STORAGE_KEY)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_locale')
          .eq('id', session.user.id)
          .maybeSingle()
        const meta = session.user.user_metadata?.preferred_locale
        const fromProfile = profile?.preferred_locale && isLocale(profile.preferred_locale) ? profile.preferred_locale : null
        const fromMeta = typeof meta === 'string' && isLocale(meta) ? meta : null
        const resolved = fromProfile ?? fromMeta
        if (!cancelled && resolved) {
          setLocaleState(resolved)
          localStorage.setItem(STORAGE_KEY, resolved)
          setMounted(true)
          return
        }
      }
      if (!cancelled && stored && isLocale(stored)) {
        setLocaleState(stored)
      }
      setMounted(true)
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) return
      if (event !== 'SIGNED_IN' && event !== 'TOKEN_REFRESHED' && event !== 'USER_UPDATED') return
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_locale')
        .eq('id', session.user.id)
        .maybeSingle()
      if (profile?.preferred_locale && isLocale(profile.preferred_locale)) {
        setLocaleState(profile.preferred_locale)
        localStorage.setItem(STORAGE_KEY, profile.preferred_locale)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, l)
      document.documentElement.lang = l === 'no' ? 'nb' : l === 'se' ? 'se' : 'en'
    }
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('profiles').update({ preferred_locale: l }).eq('id', user.id)
      await supabase.auth.updateUser({ data: { preferred_locale: l } })
    })()
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
