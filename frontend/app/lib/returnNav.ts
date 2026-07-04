/** Safe internal path for `returnTo` query params (same rules as sign-terms). */
export function resolveSafeReturnTo(
  raw: string | null | undefined,
  fallback: string
): string {
  const trimmed = raw?.trim() || ''
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  return fallback
}

function pathOnly(pathname: string): string {
  const base = pathname.split('?')[0] || '/'
  if (base.length > 1 && base.endsWith('/')) return base.slice(0, -1)
  return base
}

type ReturnLabelKey =
  | 'back'
  | 'messages'
  | 'backToUsers'
  | 'backToHousingBank'
  | 'myProperties'
  | 'notifications'
  | 'housingBank'

/** User-facing label when navigating back to a stored return path. */
export function labelForReturnPath(
  returnPath: string,
  t: (key: ReturnLabelKey) => string
): string {
  const path = pathOnly(returnPath)
  if (path === '/nav/users' || path.startsWith('/nav/users/')) return t('backToUsers')
  if (path === '/nav/notifications') return t('notifications')
  if (path === '/nav/database' || path.startsWith('/listings/')) return t('backToHousingBank')
  if (path === '/homeowner/manage') return t('myProperties')
  if (path.startsWith('/nav/event/')) return t('housingBank')
  return t('back')
}

export function buildNavMessagesHref(params: {
  with?: string | null
  area?: string | null
  booking?: string | null
  event?: string | null
  returnTo?: string | null
}): string {
  const sp = new URLSearchParams()
  if (params.with) sp.set('with', params.with)
  if (params.area) sp.set('area', params.area)
  if (params.booking) sp.set('booking', params.booking)
  if (params.event) sp.set('event', params.event)
  if (params.returnTo?.trim()) sp.set('returnTo', params.returnTo.trim())
  const q = sp.toString()
  return q ? `/nav/messages?${q}` : '/nav/messages'
}

/** Preserve `returnTo` when opening another thread on the messages page. */
export function withReturnTo(href: string, returnTo: string | null | undefined): string {
  if (!returnTo?.trim()) return href
  const safe = resolveSafeReturnTo(returnTo, '')
  if (!safe) return href
  const [pathAndQuery, hash = ''] = href.split('#')
  const qIndex = pathAndQuery.indexOf('?')
  const pathname = qIndex >= 0 ? pathAndQuery.slice(0, qIndex) : pathAndQuery
  const sp = new URLSearchParams(qIndex >= 0 ? pathAndQuery.slice(qIndex + 1) : '')
  sp.set('returnTo', safe)
  const query = sp.toString()
  return `${pathname}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`
}
