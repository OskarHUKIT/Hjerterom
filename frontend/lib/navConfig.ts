import type { LucideIcon } from 'lucide-react'
import { Bell, Building2, Home, MessageSquare } from 'lucide-react'
import { APP_SHELL_NAV_BY_ROLE, type AppShellNavItem } from './appShellNavConfig'

/** Who sees this nav item in the app shell. */
export type NavAudience = 'kommune' | 'landlord'

/** Where the item is rendered (header drawer vs mobile bottom tabs vs app shell sidebar). */
export type NavSurface =
  | 'headerDesktop'
  | 'mobileTab'
  | 'mobileMore'
  | 'sidebarDesktop'
  | 'sidebarMobile'

export type NavBadge = 'notifications' | 'messages' | 'losInbox'

export type NavItemId =
  | 'database'
  | 'messages'
  | 'notifications'
  | 'manage'
  | 'users'
  | 'expired'
  | 'termsDocuments'
  | 'kommuneAccess'
  | 'eventInquiries'
  | 'losInbox'

export type NavItemDef = {
  id: NavItemId
  href: string
  labelKey: string
  shortLabelKey?: string
  icon: LucideIcon
  audiences: NavAudience[]
  surfaces: NavSurface[]
  adminOnly?: boolean
  badge?: NavBadge
}

function shellItemToNavDef(item: AppShellNavItem, audience: NavAudience): NavItemDef | null {
  const id = item.id as NavItemId
  const validIds: NavItemId[] = [
    'database',
    'messages',
    'notifications',
    'manage',
    'users',
    'expired',
    'termsDocuments',
    'kommuneAccess',
    'eventInquiries',
    'losInbox',
  ]
  if (!validIds.includes(id)) return null

  const surfaces: NavSurface[] = ['headerDesktop', 'sidebarDesktop', 'sidebarMobile']
  if (id === 'database' || id === 'messages' || id === 'notifications' || id === 'manage') {
    surfaces.push('mobileTab')
  }
  if (
    id === 'users' ||
    id === 'expired' ||
    id === 'termsDocuments' ||
    id === 'kommuneAccess' ||
    id === 'eventInquiries' ||
    id === 'losInbox'
  ) {
    surfaces.push('mobileMore')
  }

  return {
    id,
    href: item.href,
    labelKey: item.labelKey,
    shortLabelKey: item.shortLabelKey,
    icon: item.icon,
    audiences: [audience],
    surfaces,
    adminOnly: item.adminOnly,
    badge: item.badge,
  }
}

function buildLegacyNavItems(): NavItemDef[] {
  const kommune = APP_SHELL_NAV_BY_ROLE['municipality-admin']
    .map((item) => shellItemToNavDef(item, 'kommune'))
    .filter((item): item is NavItemDef => item != null)
  const landlord = APP_SHELL_NAV_BY_ROLE.landlord
    .map((item) => shellItemToNavDef(item, 'landlord'))
    .filter((item): item is NavItemDef => item != null)
  return [...kommune, ...landlord]
}

/** Legacy nav list — derived from `appShellNavConfig` for Header / MobileBottomNav. */
export const APP_NAV_ITEMS: NavItemDef[] = buildLegacyNavItems()

export function navItemsFor(
  audience: NavAudience,
  surface: NavSurface,
  opts?: {
    isAdmin?: boolean
    platform?: { social?: boolean; centralEvents?: boolean; los?: boolean }
  }
): NavItemDef[] {
  return APP_NAV_ITEMS.filter((item) => {
    if (!item.audiences.includes(audience)) return false
    if (!item.surfaces.includes(surface)) return false
    if (item.adminOnly && !opts?.isAdmin) return false
    if (opts?.platform?.social === false) {
      const socialOnly: NavItemId[] = [
        'database',
        'users',
        'expired',
        'termsDocuments',
        'kommuneAccess',
        'losInbox',
      ]
      if (socialOnly.includes(item.id)) return false
    }
    if (item.id === 'eventInquiries' && opts?.platform?.centralEvents === false) return false
    if (item.id === 'losInbox' && opts?.platform?.los === false) return false
    return true
  })
}

export function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/homeowner/manage') {
    return pathname === '/homeowner/manage' || pathname.startsWith('/homeowner/listings/')
  }
  if (href === '/homeowner/bookings') {
    return pathname === '/homeowner/bookings' || pathname.startsWith('/homeowner/bookings/')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function navItemsForSidebar(
  audience: NavAudience,
  opts?: {
    isAdmin?: boolean
    platform?: { social?: boolean; centralEvents?: boolean; los?: boolean }
  }
): NavItemDef[] {
  return APP_NAV_ITEMS.filter((item) => {
    if (!item.audiences.includes(audience)) return false
    if (!item.surfaces.includes('sidebarDesktop')) return false
    if (item.adminOnly && !opts?.isAdmin) return false
    if (opts?.platform?.social === false) {
      const socialOnly: NavItemId[] = [
        'database',
        'users',
        'expired',
        'termsDocuments',
        'kommuneAccess',
        'losInbox',
      ]
      if (socialOnly.includes(item.id)) return false
    }
    if (item.id === 'eventInquiries' && opts?.platform?.centralEvents === false) return false
    if (item.id === 'losInbox' && opts?.platform?.los === false) return false
    return true
  })
}

export function navBadgeCount(
  badge: NavBadge,
  counts: { notifications: number; messages: number; losInbox: number }
): number {
  if (badge === 'notifications') return counts.notifications
  if (badge === 'messages') return counts.messages
  return counts.losInbox
}
