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
  parseStoredConsent,
  writeConsent,
  type CookieConsentChoice,
} from '../app/lib/cookieConsentStorage'

type CookieConsentContextValue = {
  /** Klar etter lesing fra localStorage (unngå layout-flash). */
  ready: boolean
  /** Bruker har ikke valgt, eller banner er åpnet på nytt fra footer. */
  showBanner: boolean
  /** Gjeldende valg etter lagring; undefined før første valg. */
  choice: CookieConsentChoice | undefined
  /** Valgfrie/analyse/markedsføring – reserver for fremtidige skript (f.eks. måling). */
  allowsOptionalCookies: boolean
  acceptNecessary: () => void
  acceptAll: () => void
  /** Åpne banner igjen (endre valg). */
  reopenCookieSettings: () => void
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [choice, setChoice] = useState<CookieConsentChoice | undefined>(undefined)
  const [forceOpen, setForceOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = parseStoredConsent(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY))
      if (stored) setChoice(stored.choice)
    } catch {
      /* ignore */
    }
    setReady(true)
  }, [])

  const applyChoice = useCallback((c: CookieConsentChoice) => {
    writeConsent(c)
    setChoice(c)
    setForceOpen(false)
  }, [])

  const acceptNecessary = useCallback(() => applyChoice('necessary'), [applyChoice])
  const acceptAll = useCallback(() => applyChoice('all'), [applyChoice])

  const reopenCookieSettings = useCallback(() => {
    setForceOpen(true)
  }, [])

  const showBanner = ready && (choice === undefined || forceOpen)

  const allowsOptionalCookies = choice === 'all'

  const value = useMemo(
    () =>
      ({
        ready,
        showBanner,
        choice,
        allowsOptionalCookies,
        acceptNecessary,
        acceptAll,
        reopenCookieSettings,
      }) satisfies CookieConsentContextValue,
    [
      ready,
      showBanner,
      choice,
      allowsOptionalCookies,
      acceptNecessary,
      acceptAll,
      reopenCookieSettings,
    ]
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
