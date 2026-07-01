/**
 * Translations for Norwegian (no), Northern Sami (se), and English (en).
 * Northern Sami = Davvisámegiella (most widely used Sami language).
 *
 * Domain slices live in lib/i18n/ (Wave 6 barrel merge).
 */
import { commonTranslations } from './i18n/common'
import { finnTranslations } from './i18n/finn'
import { listingsTranslations } from './i18n/listings'
import { navTranslations } from './i18n/nav'
import { opsTranslations } from './i18n/ops'

export type Locale = 'no' | 'se' | 'en'

type LocaleSlice = Record<string, string>
type DomainBundle = Record<Locale, LocaleSlice>

function mergeLocale(locale: Locale, ...parts: DomainBundle[]): LocaleSlice {
  return Object.assign({}, ...parts.map((part) => part[locale]))
}

export const translations = {
  no: mergeLocale('no', commonTranslations, listingsTranslations, navTranslations, finnTranslations, opsTranslations),
  se: mergeLocale('se', commonTranslations, listingsTranslations, navTranslations, finnTranslations, opsTranslations),
  en: mergeLocale('en', commonTranslations, listingsTranslations, navTranslations, finnTranslations, opsTranslations),
} as const

export type TranslationKey = keyof typeof translations.no
