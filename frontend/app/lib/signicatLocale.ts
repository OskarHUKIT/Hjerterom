import type { Locale } from '@/lib/translations'

/**
 * Signicat eID Hub / Wallet UI locales (OIDC `ui_locales`) and Sign API v2 `ui.language`
 * use lowercase ISO 639-1 codes. North Sámi and other Sámi variants are not listed by Signicat —
 * use Norwegian for BankID and signing UI.
 *
 * @see https://developer.signicat.com/docs/eid-hub/concepts/localisation/
 */
export function bolyLocaleToSignicatUi(locale: Locale): 'no' | 'en' {
  if (locale === 'en') return 'en'
  return 'no'
}
