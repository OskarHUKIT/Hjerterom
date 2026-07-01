/**
 * One-off generator: splits lib/translations.ts into domain files under lib/i18n/.
 * Run: npx tsx scripts/split-i18n.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { translations } from '../lib/translations.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../lib/i18n')

/** @typedef {'common' | 'listings' | 'nav' | 'finn' | 'ops'} Domain */

/** @param {string} k @returns {Domain} */
function classify(k) {
  if (k.startsWith('ops')) return 'ops'
  if (
    k.startsWith('finn') ||
    k.startsWith('homeFinn') ||
    k.startsWith('guest') ||
    k.startsWith('tourism') ||
    k.startsWith('booking') ||
    k.startsWith('checkout') ||
    k === 'stripeConnectTitle' ||
    k === 'stripeConnectLead' ||
    k === 'stripeConnectCta' ||
    k === 'stripeConnectLoading' ||
    k === 'stripeConnectError' ||
    k === 'landlordBookingAcceptedToast'
  )
    return 'finn'

  if (
    k.startsWith('db') ||
    k.startsWith('nav') ||
    k.startsWith('messages') ||
    k.startsWith('mediation') ||
    k.startsWith('formidling') ||
    k.startsWith('kommune') ||
    k.startsWith('staff') ||
    k.startsWith('tabLos') ||
    k.startsWith('invoice') ||
    k.startsWith('handover') ||
    k.startsWith('tenantHandover') ||
    k.startsWith('depositGuarantee') ||
    k.startsWith('noAccessExpired') ||
    k.startsWith('tabLandlords') ||
    k.startsWith('tabStaff') ||
    k.startsWith('housingBank') ||
    k.startsWith('users') ||
    k.startsWith('expiredOwner') ||
    k.startsWith('messagingTerminated') ||
    k.startsWith('thisPropertyMarked') ||
    k.startsWith('removeFormidling') ||
    k.startsWith('periodDateRange') ||
    k.startsWith('noteForCaseworker') ||
    k.startsWith('contactInfoForFormidling') ||
    k.startsWith('linkForTenant') ||
    k.startsWith('tidsspannFormidling') ||
    k.startsWith('startFormidling') ||
    k.startsWith('paymentMethod') ||
    k === 'formidling' ||
    k === 'formidlingManagedByCaseworker' ||
    k === 'formidlingManagedByCaseworkerShort' ||
    k === 'backToHousingBank' ||
    k === 'noAccessThisListing' ||
    k === 'listingInRegionDesc' ||
    k === 'tenant' ||
    k === 'message' ||
    k === 'formidletUseRemoveBelow' ||
    k === 'conditionDescription' ||
    k === 'selectStartEndFormidling' ||
    k === 'endDateAfterStart' ||
    k === 'generateNewLinkConfirm' ||
    k === 'commentFromKommune' ||
    k === 'messageFromKommune' ||
    k === 'confirmRemovePeriod' ||
    k === 'mediationNoteOptional' ||
    k === 'mediationNotePlaceholder' ||
    k === 'includeMediationNoteInNotification'
  )
    return 'nav'

  if (
    k.startsWith('listing') ||
    k.startsWith('reg') ||
    k.startsWith('manage') ||
    k.startsWith('landlord') ||
    k.startsWith('lane') ||
    k.startsWith('signTerms') ||
    k.startsWith('terms') ||
    k.startsWith('confirmDelete') ||
    k.startsWith('backToMyProperties') ||
    k.startsWith('backToHome') ||
    k.startsWith('calendar') ||
    k.startsWith('date') ||
    k.startsWith('availability') ||
    k.startsWith('event') ||
    k.startsWith('homeLos') ||
    k.startsWith('placeholder') ||
    k.startsWith('registeredProperties') ||
    k.startsWith('myProperties') ||
    k.startsWith('signedAgreement') ||
    k.startsWith('signAgreement') ||
    k.startsWith('imagesAdded') ||
    k.startsWith('errorSaving') ||
    k.startsWith('errorPrefix') ||
    k.startsWith('errorUploading') ||
    k.startsWith('errorSavingNote') ||
    k.startsWith('couldNotGenerateLink') ||
    k.startsWith('seeDetails') ||
    k.startsWith('agreementHistory') ||
    k.startsWith('deleteShort') ||
    k.startsWith('registerSuccess') ||
    k === 'from' ||
    k === 'to' ||
    k === 'addSubmit' ||
    k === 'landlord'
  )
    return 'listings'

  return 'common'
}

/** @param {string} value */
function serializeString(value) {
  // JSON.stringify handles quotes, newlines, and unicode safely.
  return JSON.stringify(value)
}

/** @param {Record<string, string>} slice */
function serializeLocaleSlice(slice) {
  const lines = []
  for (const [key, value] of Object.entries(slice)) {
    const serialized = serializeString(value)
    if (serialized.length > 72) {
      lines.push(`    ${key}:\n      ${serialized},`)
    } else {
      lines.push(`    ${key}: ${serialized},`)
    }
  }
  return lines.join('\n')
}

/** @param {Domain} domain @param {Record<Domain, Record<string, Record<string, string>>>} byDomain */
function writeDomainFile(domain, byDomain) {
  const locales = ['no', 'se', 'en']
  const body = locales
    .map(
      (locale) => `  ${locale}: {\n${serializeLocaleSlice(byDomain[domain][locale])}\n  }`,
    )
    .join(',\n')

  const content = `/**
 * i18n: ${domain} domain (Wave 6 split).
 * Merged in lib/translations.ts — do not import directly from app code.
 */
export const ${domain}Translations = {
${body},
} as const
`
  fs.writeFileSync(path.join(outDir, `${domain}.ts`), content)
}

const keys = Object.keys(translations.no)
/** @type {Record<Domain, Record<string, Record<string, string>>>} */
const byDomain = {
  common: { no: {}, se: {}, en: {} },
  listings: { no: {}, se: {}, en: {} },
  nav: { no: {}, se: {}, en: {} },
  finn: { no: {}, se: {}, en: {} },
  ops: { no: {}, se: {}, en: {} },
}

for (const k of keys) {
  const domain = classify(k)
  for (const locale of ['no', 'se', 'en']) {
    byDomain[domain][locale][k] = translations[locale][k]
  }
}

fs.mkdirSync(outDir, { recursive: true })
for (const domain of ['common', 'listings', 'nav', 'finn', 'ops']) {
  writeDomainFile(domain, byDomain)
  console.log(`${domain}: ${Object.keys(byDomain[domain].no).length} keys`)
}
