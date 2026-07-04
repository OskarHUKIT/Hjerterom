/** Parse internal sign-terms href (path + query). */
export function parseSignTermsHref(href: string) {
  const url = href.startsWith('http')
    ? new URL(href)
    : new URL(href, 'https://local.invalid')
  const returnToRaw = url.searchParams.get('returnTo')?.trim() || ''
  const safeReturn =
    returnToRaw.startsWith('/') && !returnToRaw.startsWith('//') ? returnToRaw : '/homeowner/manage'
  return {
    doc: url.searchParams.get('doc')?.trim() || '',
    city: url.searchParams.get('city')?.trim() || '',
    returnTo: safeReturn,
    pendingListing: url.searchParams.get('pendingListing') === '1',
  }
}

export function buildSignTermsHref(params: {
  doc?: string | null
  city?: string | null
  returnTo?: string
  pendingListing?: boolean
}): string {
  const sp = new URLSearchParams()
  if (params.doc?.trim()) sp.set('doc', params.doc.trim())
  if (params.city?.trim()) sp.set('city', params.city.trim())
  if (params.returnTo) sp.set('returnTo', params.returnTo)
  if (params.pendingListing) sp.set('pendingListing', '1')
  const q = sp.toString()
  return q ? `/homeowner/sign-terms?${q}` : '/homeowner/sign-terms'
}
