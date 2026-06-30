import type { LucideIcon } from 'lucide-react'
import { Bell, Building2, Home, MessageSquare } from 'lucide-react'

/** Who sees this nav item in the app shell. */
export type NavAudience = 'kommune' | 'landlord'

/** Where the item is rendered (header drawer vs mobile bottom tabs). */
export type NavSurface = 'headerDesktop' | 'mobileTab' | 'mobileMore'

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
  badge?: 'notifications'
}

/** Single source of truth for app navigation (Header + MobileBottomNav). */
export const APP_NAV_ITEMS: NavItemDef[] = [
  {
    id: 'database',
    href: '/nav/database',
    labelKey: 'housingBank',
    icon: Building2,
    audiences: ['kommune'],
    surfaces: ['headerDesktop', 'mobileTab'],
  },
  {
    id: 'users',
    href: '/nav/users',
    labelKey: 'navLandlords',
    icon: Building2,
    audiences: ['kommune'],
    surfaces: ['headerDesktop', 'mobileMore'],
  },
  {
    id: 'messages',
    href: '/nav/messages',
    labelKey: 'messages',
    icon: MessageSquare,
    audiences: ['kommune', 'landlord'],
    surfaces: ['headerDesktop', 'mobileTab'],
  },
  {
    id: 'expired',
    href: '/nav/expired',
    labelKey: 'expired',
    icon: Building2,
    audiences: ['kommune'],
    surfaces: ['headerDesktop', 'mobileMore'],
  },
  {
    id: 'termsDocuments',
    href: '/nav/terms-documents',
    labelKey: 'termsDocumentsNav',
    icon: Building2,
    audiences: ['kommune'],
    surfaces: ['headerDesktop', 'mobileMore'],
    adminOnly: true,
  },
  {
    id: 'eventInquiries',
    href: '/nav/event-inquiries',
    labelKey: 'navEventInquiriesTitle',
    icon: Building2,
    audiences: ['kommune'],
    surfaces: ['mobileMore'],
  },
  {
    id: 'losInbox',
    href: '/nav/los-inbox',
    labelKey: 'navLosInboxTitle',
    icon: Building2,
    audiences: ['kommune'],
    surfaces: ['mobileMore'],
  },
  {
    id: 'notifications',
    href: '/nav/notifications',
    labelKey: 'notifications',
    icon: Bell,
    audiences: ['kommune', 'landlord'],
    surfaces: ['headerDesktop', 'mobileTab'],
    badge: 'notifications',
  },
  {
    id: 'manage',
    href: '/homeowner/manage',
    labelKey: 'myProperties',
    shortLabelKey: 'myPropertiesTabShort',
    icon: Home,
    audiences: ['landlord'],
    surfaces: ['headerDesktop', 'mobileTab'],
  },
]

export function navItemsFor(
  audience: NavAudience,
  surface: NavSurface,
  opts?: { isAdmin?: boolean }
): NavItemDef[] {
  return APP_NAV_ITEMS.filter((item) => {
    if (!item.audiences.includes(audience)) return false
    if (!item.surfaces.includes(surface)) return false
    if (item.adminOnly && !opts?.isAdmin) return false
    return true
  })
}

export function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}
