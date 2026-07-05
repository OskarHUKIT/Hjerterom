import type { LucideIcon } from 'lucide-react'
import { CalendarDays, FileText, Home, MessageSquare } from 'lucide-react'

export type HomeownerNavBadge = 'messages'

export type HomeownerNavItem = {
  id: 'manage' | 'messages' | 'agreements' | 'bookings'
  href: string
  labelKey: string
  icon: LucideIcon
  badge?: HomeownerNavBadge
}

/** @deprecated Use `appShellNavConfig` via the unified app shell. */
export function homeownerNavItems(opts: { stripeBookings?: boolean }): HomeownerNavItem[] {
  const items: HomeownerNavItem[] = [
    {
      id: 'manage',
      href: '/homeowner/manage',
      labelKey: 'myProperties',
      icon: Home,
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

  if (opts.stripeBookings) {
    items.push({
      id: 'bookings',
      href: '/homeowner/bookings',
      labelKey: 'homeownerNavBookings',
      icon: CalendarDays,
    })
  }

  return items
}

/** @deprecated Use `isAppShellNavActive` from `appShellNavConfig`. */
export function isHomeownerNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/homeowner/manage') {
    return pathname === '/homeowner/manage' || pathname.startsWith('/homeowner/listings/')
  }
  if (href === '/homeowner/bookings') {
    return pathname === '/homeowner/bookings' || pathname.startsWith('/homeowner/bookings/')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
