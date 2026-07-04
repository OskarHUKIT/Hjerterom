import { isEventStaffRole } from './eventStaffRoles'
import { isKommuneStaffRole } from './kommuneRoles'
import {
  buildNavMessagesHref,
  labelForReturnPath,
  resolveSafeReturnTo,
} from './returnNav'

/** Rolle-basert «hjem»-side for innlogget bruker. */
export function getAppHubHref(role: string | null | undefined): string {
  if (isKommuneStaffRole(role)) return '/nav/database'
  if (isEventStaffRole(role)) return '/nav/event/database'
  if (role === 'leietaker') return '/finn/mine'
  return '/homeowner/manage'
}

export type AppHubLabelKey = 'housingBank' | 'myProperties' | 'finnNavMine' | 'overview' | 'back'

export function getAppHubLabelKey(role: string | null | undefined): AppHubLabelKey {
  if (isKommuneStaffRole(role)) return 'housingBank'
  if (isEventStaffRole(role)) return 'housingBank'
  if (role === 'leietaker') return 'finnNavMine'
  return 'myProperties'
}

function pathOnly(pathname: string): string {
  const base = pathname.split('?')[0] || '/'
  if (base.length > 1 && base.endsWith('/')) return base.slice(0, -1)
  return base
}

export function hasActiveUrlQuery(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.search.length > 1
}

type ContextualBackLabelKey =
  | AppHubLabelKey
  | 'back'
  | 'messages'
  | 'backToUsers'
  | 'backToHousingBank'
  | 'myProperties'
  | 'notifications'

/** Tilbake-lenke fra undersider til riktig hub (ikke blind history.back). */
export function getContextualBackLink(
  pathname: string,
  role: string | null | undefined,
  t: (key: ContextualBackLabelKey) => string,
  options?: { inThread?: boolean; returnTo?: string | null }
): { href: string; label: string } | null {
  const path = pathOnly(pathname)
  const hub = getAppHubHref(role)
  const hubPath = pathOnly(hub)
  const safeReturn = options?.returnTo
    ? resolveSafeReturnTo(options.returnTo, hub)
    : null

  if (path === hubPath && !options?.inThread) return null

  if (path === '/nav/messages') {
    if (options?.inThread) {
      return {
        href: buildNavMessagesHref({ returnTo: safeReturn }),
        label: t('messages'),
      }
    }
    if (safeReturn && pathOnly(safeReturn) !== '/nav/messages') {
      return {
        href: safeReturn,
        label: labelForReturnPath(safeReturn, t),
      }
    }
    return { href: hub, label: t(getAppHubLabelKey(role)) }
  }

  if (path.startsWith('/nav/event/messages')) {
    if (options?.inThread) {
      return { href: '/nav/event/messages', label: t('messages') }
    }
    return { href: hub, label: t(getAppHubLabelKey(role)) }
  }

  if (path.startsWith('/nav/users/') || (path === '/nav/users' && hasActiveUrlQuery())) {
    if (path !== '/nav/users') {
      return { href: '/nav/users', label: t('backToUsers') }
    }
  }

  if (path.startsWith('/listings/')) {
    return { href: hub, label: t(getAppHubLabelKey(role)) }
  }

  if (path === '/homeowner/register' || path.startsWith('/homeowner/sign-terms')) {
    if (hubPath === path) return { href: '/', label: t('overview') }
    return { href: hub, label: t(getAppHubLabelKey(role)) }
  }

  if (path.startsWith('/homeowner/') && path !== hubPath) {
    return { href: hub, label: t(getAppHubLabelKey(role)) }
  }

  if (path.startsWith('/nav/event/') && path !== hubPath) {
    return { href: hub, label: t(getAppHubLabelKey(role)) }
  }

  if (path.startsWith('/nav/') && path !== hubPath) {
    return { href: hub, label: t(getAppHubLabelKey(role)) }
  }

  return null
}

/** Utleier registrering: tilbake til manage kun hvis bruker faktisk har tilgang dit. */
export function getRegisterBackHref(postLoginHref: string): string {
  if (postLoginHref === '/homeowner/manage') return '/homeowner/manage'
  if (postLoginHref.startsWith('/homeowner/sign-terms')) return postLoginHref
  return '/'
}
