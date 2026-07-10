/**
 * Lazy-lastede i18n-domener — holdes utenfor hovedbunten.
 * `import()` fyres ved modul-evaluering slik at chunkene lastes
 * parallelt med hydrering (i praksis klare før første meningsfulle paint).
 */
import type { Locale } from '../translations'

export type LocaleSlice = Record<string, string>
export type DomainBundle = Record<Locale, LocaleSlice>

/** Rekkefølgen matcher lib/translations.ts: common, listings, nav, finn, ops. */
export const lazyDomainsPromise: Promise<{
  listings: DomainBundle
  finn: DomainBundle
  ops: DomainBundle
}> = Promise.all([
  import('./listings').then((m) => m.listingsTranslations as DomainBundle),
  import('./finn').then((m) => m.finnTranslations as DomainBundle),
  import('./ops').then((m) => m.opsTranslations as DomainBundle),
]).then(([listings, finn, ops]) => ({ listings, finn, ops }))
