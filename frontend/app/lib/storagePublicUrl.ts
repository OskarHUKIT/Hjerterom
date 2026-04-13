/**
 * Bygg URL til offentlig Storage-objekt (bucket `documents`).
 * Bruk ALLTID denne i stedet for hardkodet prosjekt-URL — ellers vises gamle filer fra feil prosjekt eller cache.
 *
 * Cache-bust: `NEXT_PUBLIC_STORAGE_CACHE_BUST` (manuell, f.eks. ved bytte av PDF uten ny deploy),
 * ellers `NEXT_PUBLIC_STORAGE_DEPLOY_BUST` (satt i next.config fra Vercel ved build).
 */
export function publicDocumentsFileUrl(fileName: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const safeName = fileName.replace(/^\/+/, '').replace(/^\.\./, '')
  if (!base || !safeName) return ''
  const bust =
    (process.env.NEXT_PUBLIC_STORAGE_CACHE_BUST || '').trim() ||
    (process.env.NEXT_PUBLIC_STORAGE_DEPLOY_BUST || '').trim()
  const pathInBucket = safeName.split('/').map(encodeURIComponent).join('/')
  let url = `${base}/storage/v1/object/public/documents/${pathInBucket}`
  if (bust) url += `${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(bust)}`
  return url
}

/** Filnavn i bucket `documents` — må matche nøyaktig (samme som i Supabase). Overstyr med NEXT_PUBLIC_CONTACT_FORM_PDF_FILE. */
export function contactFormStorageFileName(): string {
  return (
    (process.env.NEXT_PUBLIC_CONTACT_FORM_PDF_FILE || 'Kontaktinfoschema.pdf').trim() ||
    'Kontaktinfoschema.pdf'
  )
}

export function publicContactInfoFormPdfUrl(): string {
  return publicDocumentsFileUrl(contactFormStorageFileName())
}
