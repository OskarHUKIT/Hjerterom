'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react'
import type { Locale, TranslationKey } from '../lib/translations'
import { commonTranslations } from '../lib/i18n/common'
import { navTranslations } from '../lib/i18n/nav'
import { lazyDomainsPromise, type DomainBundle, type LocaleSlice } from '../lib/i18n/lazy'
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

type Dicts = Record<Locale, LocaleSlice>

function mergeLocale(locale: Locale, parts: DomainBundle[]): LocaleSlice {
  return Object.assign({}, ...parts.map((part) => part[locale]))
}

function buildDicts(parts: DomainBundle[]): Dicts {
  return {
    no: mergeLocale('no', parts),
    se: mergeLocale('se', parts),
    en: mergeLocale('en', parts),
  }
}

/**
 * Eager-basen dekker header/nav/felles-tekster (common + nav).
 * listings/finn/ops lastes som egne chunks via lazyDomainsPromise —
 * ~60 % av ordboksvekten holdes utenfor førstelast-bunten.
 */
const baseDicts: Dicts = buildDicts([commonTranslations, navTranslations])

/** Stabil fallback når useLanguage brukes utenfor provider (identitet bevares mellom kall). */
const noProviderFallback: LanguageContextType = {
  locale: defaultLocale,
  setLocale: () => {},
  t: (key: TranslationKey) => baseDicts.no[key] ?? key,
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, isReady: authReady } = useAuthSession()
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [dicts, setDicts] = useState<Dicts>(baseDicts)
  const [mounted, setMounted] = useState(false)

  /** Flett inn lazy-domener når chunkene er lastet — samme flettrekkefølge som gamle lib/translations.ts. */
  useEffect(() => {
    let cancelled = false
    lazyDomainsPromise.then(({ listings, finn, ops }) => {
      if (cancelled) return
      setDicts(buildDicts([commonTranslations, listings, navTranslations, finn, ops]))
    })
    return () => {
      cancelled = true
    }
  }, [])

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

  const setLocale = useCallback((l: Locale) => {
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
  }, [])

  useEffect(() => {
    if (mounted && typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'no' ? 'nb' : locale === 'se' ? 'se' : 'en'
    }
  }, [locale, mounted])

  const t = useCallback(
    (key: TranslationKey): string => dicts[locale][key] ?? dicts.no[key] ?? key,
    [dicts, locale]
  )

  /** Stabil context-verdi — hindrer re-render av alle konsumenter ved provider-re-render. */
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    return noProviderFallback
  }
  return ctx
}
