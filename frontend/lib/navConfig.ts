import type { LucideIcon } from 'lucide-react'
import { Bell, Building2, Home, MessageSquare } from 'lucide-react'

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
  | 'eventInquiries'
  | 'losInbox'

export type NavItemDef = {
  id: NavItemId
  href: string
  labelKey: string
  /** Short label for cramped mobile tabs */
  shortLabelKey?: string
  icon: LucideIcon
  audiences: NavAudience[]
  surfaces: NavSurface[]
  /** Only kommune_admin */
  adminOnly?: boolean
  /** Show unread badge from header bundle */
  badge?: NavBadge
}

/** Single source of truth for app navigation (Header + MobileBottomNav). */
export const APP_NAV_ITEMS: NavItemDef[] = [
  {
    id: 'database',
    href: '/nav/database',
    labelKey: 'housingBank',
    icon: Building2,
    audiences: ['kommune'],
    surfaces: ['headerDesktop', 'mobileTab', 'sidebarDesktop', 'sidebarMobile'],
  },
  {
    id: 'users',
    href: '/nav/users',
    labelKey: 'navLandlords',
    icon: Building2,
    audiences: ['kommune'],
    surfaces: ['headerDesktop', 'mobileMore', 'sidebarDesktop'],
  },
  {
    id: 'messages',
    href: '/nav/messages',
    labelKey: 'messages',
    icon: MessageSquare,
    audiences: ['kommune', 'landlord'],
    surfaces: ['headerDesktop', 'mobileTab', 'sidebarDesktop', 'sidebarMobile'],
    badge: 'messages',
  },
  {
    id: 'expired',
    href: '/nav/expired',
    labelKey: 'expired',
    icon: Building2,
    audiences: ['kommune'],
    surfaces: ['headerDesktop', 'mobileMore', 'sidebarDesktop'],
  },
  {
    id: 'termsDocuments',
    href: '/nav/terms-documents',
    labelKey: 'termsDocumentsNav',
    icon: Building2,
    audiences: ['kommune'],
    surfaces: ['headerDesktop', 'mobileMore', 'sidebarDesktop'],
    adminOnly: true,
  },
  {
    id: 'eventInquiries',
    href: '/nav/event-inquiries',
    labelKey: 'navEventInquiriesTitle',
    icon: Building2,
    audiences: ['kommune'],
    surfaces: ['headerDesktop', 'mobileMore', 'sidebarDesktop'],
  },
  {
    id: 'losInbox',
    href: '/nav/los-inbox',
    labelKey: 'navLosInboxTitle',
    icon: Building2,
    audiences: ['kommune'],
    surfaces: ['headerDesktop', 'mobileMore', 'sidebarDesktop', 'sidebarMobile'],
    badge: 'losInbox',
  },
  {
    id: 'notifications',
    href: '/nav/notifications',
    labelKey: 'notifications',
    icon: Bell,
    audiences: ['kommune', 'landlord'],
    surfaces: ['headerDesktop', 'mobileTab', 'sidebarDesktop', 'sidebarMobile'],
    badge: 'notifications',
  },
  {
    id: 'manage',
    href: '/homeowner/manage',
    labelKey: 'myProperties',
    shortLabelKey: 'myPropertiesTabShort',
    icon: Home,
    audiences: ['landlord'],
    surfaces: ['headerDesktop', 'mobileTab', 'sidebarDesktop', 'sidebarMobile'],
  },
]

export function navItemsFor(
  audience: NavAudience,
  surface: NavSurface,
  opts?: {
    isAdmin?: boolean
    /** Hide Hjerterum nav when modules are off (from platform_settings). */
    platform?: { centralEvents?: boolean; los?: boolean }
  }
): NavItemDef[] {
  return APP_NAV_ITEMS.filter((item) => {
    if (!item.audiences.includes(audience)) return false
    if (!item.surfaces.includes(surface)) return false
    if (item.adminOnly && !opts?.isAdmin) return false
    if (item.id === 'eventInquiries' && opts?.platform?.centralEvents === false) return false
    if (item.id === 'losInbox' && opts?.platform?.los === false) return false
    return true
  })
}

export function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Desktop sidebar: primary tabs + secondary «more» items in one list. */
export function navItemsForSidebar(
  audience: NavAudience,
  opts?: {
    isAdmin?: boolean
    platform?: { centralEvents?: boolean; los?: boolean }
  }
): NavItemDef[] {
  return APP_NAV_ITEMS.filter((item) => {
    if (!item.audiences.includes(audience)) return false
    if (!item.surfaces.includes('sidebarDesktop')) return false
    if (item.adminOnly && !opts?.isAdmin) return false
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
