import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Building2,
  CalendarDays,
  FileText,
  Home,
  Map as MapIcon,
  MessageSquare,
  TimerOff,
  Users,
} from 'lucide-react'
import { isKommuneAdminRole, isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { isEventStaffRole } from '@/app/lib/eventStaffRoles'

/** App shell roles — maps to DB profile roles via `resolveAppShellRole`. */
export type AppShellRole =
  | 'landlord'
  | 'municipality-admin'
  | 'municipality-caseworker'
  | 'event-caseworker'

export type AppShellNavBadge = 'messages' | 'notifications' | 'losInbox'

export type AppShellNavItem = {
  id: string
  href: string
  labelKey: string
  shortLabelKey?: string
  icon: LucideIcon
  badge?: AppShellNavBadge
  /** Only shown for municipality-admin */
  adminOnly?: boolean
  /** Hidden when platform module is off */
  requiresPlatform?: 'social' | 'centralEvents' | 'los' | 'stripeBookings'
}

const LANDLORD_ITEMS: AppShellNavItem[] = [
  {
    id: 'manage',
    href: '/homeowner/manage',
    labelKey: 'myProperties',
    shortLabelKey: 'myPropertiesTabShort',
    icon: Home,
  },
  {
    id: 'bookings',
    href: '/homeowner/bookings',
    labelKey: 'homeownerNavBookings',
    icon: CalendarDays,
    requiresPlatform: 'stripeBookings',
  },
  {
    id: 'messages',
    href: '/nav/messages',
    labelKey: 'messages',
    icon: MessageSquare,
    badge: 'messages',
  },
  {
    id: 'agreements',
    href: '/homeowner/agreements',
    labelKey: 'homeownerNavAgreements',
    icon: FileText,
  },
]

const MUNICIPALITY_ITEMS: AppShellNavItem[] = [
  {
    id: 'database',
    href: '/nav/database',
    labelKey: 'housingBank',
    icon: Building2,
    requiresPlatform: 'social',
  },
  {
    id: 'users',
    href: '/nav/users',
    labelKey: 'navLandlords',
    icon: Users,
    requiresPlatform: 'social',
  },
  {
    id: 'messages',
    href: '/nav/messages',
    labelKey: 'messages',
    icon: MessageSquare,
    badge: 'messages',
  },
  {
    id: 'expired',
    href: '/nav/expired',
    labelKey: 'expired',
    icon: TimerOff,
    requiresPlatform: 'social',
  },
  {
    id: 'termsDocuments',
    href: '/nav/terms-documents',
    labelKey: 'termsDocumentsNav',
    icon: FileText,
    adminOnly: true,
    requiresPlatform: 'social',
  },
  {
    id: 'eventInquiries',
    href: '/nav/event-inquiries',
    labelKey: 'navEventInquiriesTitle',
    icon: CalendarDays,
    requiresPlatform: 'centralEvents',
  },
  {
    id: 'losInbox',
    href: '/nav/los-inbox',
    labelKey: 'navLosInboxTitle',
    icon: MessageSquare,
    badge: 'losInbox',
    requiresPlatform: 'los',
  },
  {
    id: 'notifications',
    href: '/nav/notifications',
    labelKey: 'notifications',
    icon: Bell,
    badge: 'notifications',
  },
]

const EVENT_STAFF_ITEMS: AppShellNavItem[] = [
  {
    id: 'eventDatabase',
    href: '/nav/event/database',
    labelKey: 'eventNavDatabase',
    icon: MapIcon,
  },
  {
    id: 'eventInquiries',
    href: '/nav/event/inquiries',
    labelKey: 'eventNavInquiries',
    icon: CalendarDays,
  },
  {
    id: 'eventMessages',
    href: '/nav/event/messages',
    labelKey: 'eventNavMessages',
    icon: MessageSquare,
  },
]

/** Single source of truth for authenticated app shell navigation. */
export const APP_SHELL_NAV_BY_ROLE: Record<AppShellRole, AppShellNavItem[]> = {
  landlord: LANDLORD_ITEMS,
  'municipality-admin': MUNICIPALITY_ITEMS,
  'municipality-caseworker': MUNICIPALITY_ITEMS,
  'event-caseworker': EVENT_STAFF_ITEMS,
}

export type AppShellPlatformFlags = {
  social?: boolean
  centralEvents?: boolean
  los?: boolean
  stripeBookings?: boolean
}

export function resolveAppShellRole(
  dbRole: string | null | undefined,
  hasSignedTerms: boolean
): AppShellRole | null {
  if (!dbRole) return null
  if (isEventStaffRole(dbRole)) return 'event-caseworker'
  if (isKommuneAdminRole(dbRole)) return 'municipality-admin'
  if (isKommuneStaffRole(dbRole)) return 'municipality-caseworker'
  if (hasSignedTerms) return 'landlord'
  return null
}

function platformAllowsItem(
  item: AppShellNavItem,
  platform: AppShellPlatformFlags
): boolean {
  if (!item.requiresPlatform) return true
  if (item.requiresPlatform === 'social') return platform.social !== false
  if (item.requiresPlatform === 'centralEvents') return platform.centralEvents !== false
  if (item.requiresPlatform === 'los') return platform.los !== false
  if (item.requiresPlatform === 'stripeBookings') return platform.stripeBookings === true
  return true
}

export function appShellNavItems(
  role: AppShellRole | null,
  opts?: {
    platform?: AppShellPlatformFlags
  }
): AppShellNavItem[] {
  if (!role) return []
  const platform = opts?.platform ?? {}
  return APP_SHELL_NAV_BY_ROLE[role].filter((item) => {
    if (item.adminOnly && role !== 'municipality-admin') return false
    return platformAllowsItem(item, platform)
  })
}

/** Active state via pathname — uses startsWith with explicit overrides for overlapping routes. */
export function isAppShellNavActive(pathname: string | null, item: AppShellNavItem): boolean {
  if (!pathname) return false

  if (item.id === 'manage') {
    return (
      pathname === '/homeowner/manage' ||
      pathname.startsWith('/homeowner/listings/')
    )
  }

  if (item.id === 'bookings') {
    return pathname === '/homeowner/bookings' || pathname.startsWith('/homeowner/bookings/')
  }

  if (item.href === '/finn') {
    return pathname === '/finn' || pathname === '/finn/'
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function appShellNavBadgeCount(
  badge: AppShellNavBadge,
  counts: { notifications: number; messages: number; losInbox: number }
): number {
  if (badge === 'notifications') return counts.notifications
  if (badge === 'messages') return counts.messages
  return counts.losInbox
}

export function appShellLogoHref(
  role: AppShellRole | null,
  platform: AppShellPlatformFlags,
  landlordBootstrapHref: string
): string {
  if (!role) return '/'
  if (role === 'landlord') return '/homeowner/manage'
  if (role === 'event-caseworker') return '/nav/event/database'
  if (platform.social !== false) return '/nav/database'
  if (platform.centralEvents !== false) return '/nav/event-inquiries'
  return '/nav/messages'
}

/** Mobile bottom tabs — primary items per role. */
export function appShellMobileTabItems(
  role: AppShellRole | null,
  opts?: { platform?: AppShellPlatformFlags }
): AppShellNavItem[] {
  const items = appShellNavItems(role, opts)
  if (role === 'landlord') {
    const tabIds = ['manage', 'messages']
    if (opts?.platform?.stripeBookings) tabIds.push('bookings')
    return items.filter((item) => tabIds.includes(item.id))
  }
  if (role === 'municipality-admin' || role === 'municipality-caseworker') {
    return items.filter((item) =>
      ['database', 'messages', 'notifications', 'losInbox'].includes(item.id)
    )
  }
  return items
}

/** Mobile «more» sheet — secondary municipality items. */
export function appShellMobileMoreItems(
  role: AppShellRole | null,
  opts?: { platform?: AppShellPlatformFlags }
): AppShellNavItem[] {
  if (role !== 'municipality-admin' && role !== 'municipality-caseworker') return []
  const tabIds = new Set(appShellMobileTabItems(role, opts).map((i) => i.id))
  return appShellNavItems(role, opts).filter((item) => !tabIds.has(item.id))
}
