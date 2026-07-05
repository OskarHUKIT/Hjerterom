// mobile-decision: Single mobile nav config per role — tabs mirror approved Phase 0 targets; desktop sidebar stays in appShellNavConfig.
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Building2,
  CalendarDays,
  Home,
  Inbox,
  LayoutDashboard,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Menu,
  MessageCircle,
  MessageSquare,
  Search,
  User,
  Users,
  Zap,
  Luggage,
} from 'lucide-react'
import type { AppShellPlatformFlags, AppShellRole } from '@/lib/appShellNavConfig'
import { appShellNavItems } from '@/lib/appShellNavConfig'

export const MOBILE_SHELL_BREAKPOINT_PX = 768

export type MobileShellContext = 'landlord' | 'kommune' | 'event' | 'finn' | 'ops'

export type MobileShellBadge =
  | 'messages'
  | 'notifications'
  | 'losInbox'
  | 'bookings'
  | 'trips'
  | 'terms'

export type MobileShellTab = {
  id: string
  href: string
  labelKey: string
  shortLabelKey?: string
  icon: LucideIcon
  badge?: MobileShellBadge
  /** Center elevated primary action (landlord respond, ops new broadcast). */
  variant?: 'default' | 'elevated' | 'more'
  exact?: boolean
  adminOnly?: boolean
  requiresPlatform?: 'social' | 'centralEvents' | 'los' | 'stripeBookings'
}

function platformAllows(
  item: Pick<MobileShellTab, 'requiresPlatform'>,
  platform: AppShellPlatformFlags
): boolean {
  if (!item.requiresPlatform) return true
  if (item.requiresPlatform === 'social') return platform.social !== false
  if (item.requiresPlatform === 'centralEvents') return platform.centralEvents !== false
  if (item.requiresPlatform === 'los') return platform.los !== false
  if (item.requiresPlatform === 'stripeBookings') return platform.stripeBookings === true
  return true
}

function filterTabs(
  tabs: MobileShellTab[],
  platform: AppShellPlatformFlags,
  opts?: { isAdmin?: boolean }
): MobileShellTab[] {
  return tabs.filter((tab) => {
    if (tab.variant === 'more') return true
    if (tab.adminOnly && !opts?.isAdmin) return false
    return platformAllows(tab, platform)
  })
}

const LANDLORD_TABS: MobileShellTab[] = [
  {
    id: 'home',
    href: '/homeowner/manage',
    labelKey: 'mobileNavHome',
    icon: Home,
  },
  {
    id: 'bookings',
    href: '/homeowner/bookings',
    labelKey: 'homeownerNavBookings',
    shortLabelKey: 'mobileNavBookingsShort',
    icon: CalendarDays,
    badge: 'bookings',
    requiresPlatform: 'stripeBookings',
  },
  {
    id: 'respond',
    href: '/homeowner/bookings?status=pending',
    labelKey: 'mobileNavRespond',
    icon: Zap,
    variant: 'elevated',
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
    id: 'properties',
    href: '/homeowner/manage?view=boliger',
    labelKey: 'mobileNavProperties',
    icon: Building2,
  },
]

const KOMMUNE_TABS: MobileShellTab[] = [
  {
    id: 'inbox',
    href: '/nav/inbox',
    labelKey: 'mobileNavInbox',
    icon: Inbox,
    badge: 'losInbox',
    requiresPlatform: 'social',
  },
  {
    id: 'database',
    href: '/nav/database',
    labelKey: 'housingBank',
    shortLabelKey: 'mobileNavBoligbankShort',
    icon: Building2,
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
    id: 'notifications',
    href: '/nav/notifications',
    labelKey: 'notifications',
    shortLabelKey: 'mobileNavAlertsShort',
    icon: Bell,
    badge: 'notifications',
  },
  {
    id: 'more',
    href: '#more',
    labelKey: 'navMore',
    icon: Menu,
    variant: 'more',
  },
]

const EVENT_TABS: MobileShellTab[] = [
  {
    id: 'inquiries',
    href: '/nav/event/inquiries',
    labelKey: 'navEventInquiriesTitle',
    shortLabelKey: 'mobileNavInquiriesShort',
    icon: CalendarDays,
  },
  {
    id: 'database',
    href: '/nav/event/database',
    labelKey: 'eventNavDatabase',
    shortLabelKey: 'mobileNavBoligbankShort',
    icon: MapIcon,
  },
  {
    id: 'messages',
    href: '/nav/event/messages',
    labelKey: 'eventNavMessages',
    icon: MessageSquare,
  },
  {
    id: 'more',
    href: '#more',
    labelKey: 'navMore',
    icon: Menu,
    variant: 'more',
  },
]

const FINN_TABS: MobileShellTab[] = [
  {
    id: 'explore',
    href: '/finn',
    labelKey: 'finnNavExplore',
    icon: Search,
    exact: true,
  },
  {
    id: 'map',
    href: '/finn/map',
    labelKey: 'finnNavMap',
    icon: MapPin,
  },
  {
    id: 'trips',
    href: '/finn/mine',
    labelKey: 'finnNavTrips',
    icon: Luggage,
    badge: 'trips',
  },
  {
    id: 'los',
    href: '/los',
    labelKey: 'mobileNavLosHelp',
    icon: MessageCircle,
    requiresPlatform: 'los',
  },
  {
    id: 'profile',
    href: '/finn/profile',
    labelKey: 'finnNavProfile',
    icon: User,
  },
]

const OPS_TABS: MobileShellTab[] = [
  {
    id: 'dashboard',
    href: '/ops',
    labelKey: 'opsNavDashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    id: 'accounts',
    href: '/ops/accounts',
    labelKey: 'opsNavAccounts',
    icon: Users,
  },
  {
    id: 'broadcast',
    href: '/ops/broadcasts/new',
    labelKey: 'mobileNavSendAlert',
    icon: Megaphone,
    variant: 'elevated',
  },
  {
    id: 'events',
    href: '/ops/events',
    labelKey: 'opsNavEvents',
    icon: CalendarDays,
    requiresPlatform: 'centralEvents',
  },
  {
    id: 'more',
    href: '#more',
    labelKey: 'navMore',
    icon: Menu,
    variant: 'more',
  },
]

export function mobileShellTabs(
  context: MobileShellContext,
  platform: AppShellPlatformFlags = {},
  opts?: { isAdmin?: boolean }
): MobileShellTab[] {
  switch (context) {
    case 'landlord':
      return filterTabs(LANDLORD_TABS, platform, opts)
    case 'kommune':
      return filterTabs(KOMMUNE_TABS, platform, opts)
    case 'event':
      return filterTabs(EVENT_TABS, platform, opts)
    case 'finn':
      return filterTabs(FINN_TABS, platform, opts)
    case 'ops':
      return filterTabs(OPS_TABS, platform, opts)
    default:
      return []
  }
}

/** Secondary links for «Mer» sheets — derived from desktop sidebar where possible. */
export function mobileShellMoreItems(
  context: MobileShellContext,
  role: AppShellRole | null,
  platform: AppShellPlatformFlags = {},
  opts?: { isAdmin?: boolean }
): MobileShellTab[] {
  if (context === 'kommune' && role) {
    const tabIds = new Set(
      mobileShellTabs('kommune', platform, opts)
        .filter((t) => t.variant !== 'more')
        .map((t) => t.id)
    )
    return appShellNavItems(role, { platform })
      .filter((item) => !tabIds.has(item.id))
      .map((item) => ({
        id: item.id,
        href: item.href,
        labelKey: item.labelKey,
        shortLabelKey: item.shortLabelKey,
        icon: item.icon,
        badge: item.badge,
        adminOnly: item.adminOnly,
        requiresPlatform: item.requiresPlatform,
      }))
  }

  if (context === 'event') {
    return []
  }

  return []
}

export function isMobileShellTabActive(pathname: string | null, tab: MobileShellTab): boolean {
  if (!pathname || tab.variant === 'more') return false

  if (tab.id === 'home') {
    if (pathname.startsWith('/homeowner/listings/')) return false
    if (pathname === '/homeowner/manage') {
      return !pathname.includes('view=boliger')
    }
    return pathname === '/homeowner/manage'
  }

  if (tab.id === 'properties') {
    return (
      pathname.startsWith('/homeowner/listings/') ||
      (pathname.startsWith('/homeowner/manage') && pathname.includes('view=boliger'))
    )
  }

  if (tab.id === 'explore') {
    return pathname === '/finn' || pathname === '/finn/'
  }

  if (tab.id === 'trips') {
    return pathname.startsWith('/finn/mine') || pathname.startsWith('/finn/book/')
  }

  if (tab.id === 'los') {
    return pathname === '/los' || pathname.startsWith('/los/')
  }

  if (tab.id === 'respond') {
    return (
      pathname.startsWith('/homeowner/bookings') &&
      (pathname.includes('status=pending') || pathname.includes('filter=pending'))
    )
  }

  if (tab.exact) {
    return pathname === tab.href
  }

  return pathname === tab.href || pathname.startsWith(`${tab.href}/`)
}

export function appShellRoleToMobileContext(role: AppShellRole | null): MobileShellContext | null {
  if (!role) return null
  if (role === 'landlord') return 'landlord'
  if (role === 'event-caseworker') return 'event'
  return 'kommune'
}
