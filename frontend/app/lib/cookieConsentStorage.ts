/** Lagret samtykke for informasjonskapsler (GDPR / e-privacy). */

export const COOKIE_CONSENT_STORAGE_KEY = 'boly-cookie-consent-v1'

export type CookieConsentChoice = 'necessary' | 'all'

export type StoredCookieConsent = {
  v: 1
  choice: CookieConsentChoice
  ts: string
}

export function parseStoredConsent(raw: string | null): StoredCookieConsent | null {
  if (!raw?.trim()) return null
  try {
    const p = JSON.parse(raw) as Partial<StoredCookieConsent>
    if (p?.v !== 1 || (p.choice !== 'necessary' && p.choice !== 'all')) return null
    return { v: 1, choice: p.choice, ts: typeof p.ts === 'string' ? p.ts : new Date().toISOString() }
  } catch {
    return null
  }
}

export function writeConsent(choice: CookieConsentChoice): void {
  if (typeof window === 'undefined') return
  const payload: StoredCookieConsent = {
    v: 1,
    choice,
    ts: new Date().toISOString(),
  }
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearConsent(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
