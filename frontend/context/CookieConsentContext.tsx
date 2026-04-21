'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  COOKIE_CONSENT_STORAGE_KEY,
  defaultCategories,
  parseStoredConsent,
  summarizeChoice,
  writeConsent,
  type ConsentCategories,
  type CookieCategory,
  type CookieConsentChoice,
} from '../app/lib/cookieConsentStorage'

type CookieConsentContextValue = {
  /** Klar etter lesing fra localStorage (unngå layout-flash). */
  ready: boolean
  /** Bruker har ikke valgt, eller banner er åpnet på nytt fra footer. */
  showBanner: boolean
  /** Gjeldende oppsummerte valg. 'custom' = brukeren har valgt granulært. */
  choice: CookieConsentChoice | undefined
  /** Gjeldende per-kategori samtykke. */
  categories: ConsentCategories
  /** Snarvei: er minst én valgfri kapsel akseptert? */
  allowsOptionalCookies: boolean
  /** Er en spesifikk kategori akseptert (nyttig for conditional script-loading). */
  isCategoryAllowed: (c: CookieCategory) => boolean
  /** Godta alle valgfrie kategorier. */
  acceptAll: () => void
  /** Avvis alle valgfrie kategorier (beholder kun nødvendige). */
  rejectAll: () => void
  /** Lagre tilpassede valg (necessary tvinges alltid til true). */
  savePreferences: (next: Partial<Omit<ConsentCategories, 'necessary'>>) => void
  /** Åpne banner igjen (endre valg). */
  reopenCookieSettings: () => void
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [categories, setCategories] = useState<ConsentCategories>(() => defaultCategories())
  const [hasStoredChoice, setHasStoredChoice] = useState(false)
  const [forceOpen, setForceOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = parseStoredConsent(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY))
      if (stored) {
        setCategories(stored.categories)
        setHasStoredChoice(true)
      }
    } catch {
      /* ignore */
    }
    setReady(true)
  }, [])

  const applyChoice = useCallback((next: ConsentCategories) => {
    writeConsent(next)
    setCategories(next)
    setHasStoredChoice(true)
    setForceOpen(false)
  }, [])

  const acceptAll = useCallback(
    () => applyChoice({ necessary: true, analytics: true }),
    [applyChoice],
  )

  const rejectAll = useCallback(
    () => applyChoice({ necessary: true, analytics: false }),
    [applyChoice],
  )

  const savePreferences = useCallback(
    (next: Partial<Omit<ConsentCategories, 'necessary'>>) => {
      applyChoice({
        necessary: true,
        analytics: next.analytics ?? false,
      })
    },
    [applyChoice],
  )

  const reopenCookieSettings = useCallback(() => {
    setForceOpen(true)
  }, [])

  const showBanner = ready && (!hasStoredChoice || forceOpen)

  const allowsOptionalCookies = categories.analytics

  const isCategoryAllowed = useCallback(
    (c: CookieCategory) => (c === 'necessary' ? true : categories[c]),
    [categories],
  )

  const choice = hasStoredChoice ? summarizeChoice(categories) : undefined

  const value = useMemo(
    () =>
      ({
        ready,
        showBanner,
        choice,
        categories,
        allowsOptionalCookies,
        isCategoryAllowed,
        acceptAll,
        rejectAll,
        savePreferences,
        reopenCookieSettings,
      }) satisfies CookieConsentContextValue,
    [
      ready,
      showBanner,
      choice,
      categories,
      allowsOptionalCookies,
      isCategoryAllowed,
      acceptAll,
      rejectAll,
      savePreferences,
      reopenCookieSettings,
    ],
  )

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider')
  }
  return ctx
}

/** For komponenter som kan rendres uten provider (f.eks. tester). */
export function useCookieConsentOptional(): CookieConsentContextValue | null {
  return useContext(CookieConsentContext)
}
