/**
 * Lagret samtykke for informasjonskapsler (GDPR art. 7 + ekomlova §2-7b /
 * E-COM ACT 2025). Brukeren skal aktivt velge hvilke kategorier som brukes.
 *
 * Kategorier:
 *   necessary – alltid true (nødvendig for autentisering og sikkerhet)
 *   analytics – valgfri (statistikk, ytelsesmåling)
 *   marketing – valgfri (annonser, tredjepart)
 *
 * Versjonsstyring:
 *   v1 — enkel 'necessary' | 'all' streng (legacy).
 *   v2 — granulært objekt med per-kategori-bool.
 * Ved lesing av v1-data mappes den til v2 og skrives tilbake (silent migration).
 */

export const COOKIE_CONSENT_STORAGE_KEY = 'boly-cookie-consent-v1'

/** Event som fires når samtykke oppdateres (for lyttere utenfor React-treet). */
export const COOKIE_CONSENT_EVENT = 'boly:cookie-consent-changed'

export type CookieCategory = 'necessary' | 'analytics' | 'marketing'

export type ConsentCategories = {
  /** Alltid true — kan ikke skrus av. Representerer strengt nødvendige kapsler. */
  necessary: true
  analytics: boolean
  marketing: boolean
}

/** Bakoverkompatibel type — brukes fortsatt av legacy-kall (se CookieConsentContext). */
export type CookieConsentChoice = 'necessary' | 'all' | 'custom'

export type StoredCookieConsent = {
  v: 2
  categories: ConsentCategories
  /** Oppsummert valg for debug/telemetry — ikke autoritativ. */
  choice: CookieConsentChoice
  /** ISO-timestamp for når brukeren samtykket. */
  ts: string
}

type LegacyStoredConsent = { v: 1; choice: 'necessary' | 'all'; ts?: string }

function categoriesFromLegacy(choice: 'necessary' | 'all'): ConsentCategories {
  if (choice === 'all') return { necessary: true, analytics: true, marketing: true }
  return { necessary: true, analytics: false, marketing: false }
}

export function defaultCategories(): ConsentCategories {
  return { necessary: true, analytics: false, marketing: false }
}

export function summarizeChoice(c: ConsentCategories): CookieConsentChoice {
  if (c.analytics && c.marketing) return 'all'
  if (!c.analytics && !c.marketing) return 'necessary'
  return 'custom'
}

function isConsentCategories(x: unknown): x is ConsentCategories {
  if (!x || typeof x !== 'object') return false
  const c = x as Record<string, unknown>
  return c.necessary === true && typeof c.analytics === 'boolean' && typeof c.marketing === 'boolean'
}

export function parseStoredConsent(raw: string | null): StoredCookieConsent | null {
  if (!raw?.trim()) return null
  try {
    const p = JSON.parse(raw) as Partial<StoredCookieConsent> | LegacyStoredConsent
    /** v2 — granulært format. */
    if ((p as StoredCookieConsent).v === 2) {
      const v2 = p as StoredCookieConsent
      if (!isConsentCategories(v2.categories)) return null
      return {
        v: 2,
        categories: v2.categories,
        choice: summarizeChoice(v2.categories),
        ts: typeof v2.ts === 'string' ? v2.ts : new Date().toISOString(),
      }
    }
    /** v1 — legacy streng; migreres transparent. */
    const legacy = p as LegacyStoredConsent
    if (legacy?.v === 1 && (legacy.choice === 'necessary' || legacy.choice === 'all')) {
      const categories = categoriesFromLegacy(legacy.choice)
      return {
        v: 2,
        categories,
        choice: summarizeChoice(categories),
        ts: typeof legacy.ts === 'string' ? legacy.ts : new Date().toISOString(),
      }
    }
    return null
  } catch {
    return null
  }
}

export function writeConsent(categories: ConsentCategories): StoredCookieConsent {
  const payload: StoredCookieConsent = {
    v: 2,
    categories: { ...categories, necessary: true },
    choice: summarizeChoice(categories),
    ts: new Date().toISOString(),
  }
  if (typeof window === 'undefined') return payload
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(payload))
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: payload }))
  } catch {
    /* ignore quota / private mode */
  }
  return payload
}

export function clearConsent(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: null }))
  } catch {
    /* ignore */
  }
}
