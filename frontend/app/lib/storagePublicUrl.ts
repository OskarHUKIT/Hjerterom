/**
 * Bygg URL til offentlig Storage-objekt (bucket `documents`).
 * Bruk ALLTID denne i stedet for hardkodet prosjekt-URL — ellers vises gamle filer fra feil prosjekt eller cache.
 *
 * Når du bytter ut en PDF i Storage med samme filnavn, øk
 * NEXT_PUBLIC_STORAGE_CACHE_BUST i Vercel/.env (f.eks. dato eller "2") og redeploy,
 * slik at nettlesere/CDN henter ny fil (?v=...).
 */
export function publicDocumentsFileUrl(fileName: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const safeName = fileName.replace(/^\/+/, '').replace(/^\.\./, '')
  if (!base || !safeName) return ''
  const bust = (process.env.NEXT_PUBLIC_STORAGE_CACHE_BUST || '').trim()
  const pathInBucket = safeName.split('/').map(encodeURIComponent).join('/')
  let url = `${base}/storage/v1/object/public/documents/${pathInBucket}`
  if (bust) url += `${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(bust)}`
  return url
}
