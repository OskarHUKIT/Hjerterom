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
      href: '/homeowner/manage#bookings',
      labelKey: 'homeownerNavBookings',
      icon: CalendarDays,
    })
  }

  return items
}

export function isHomeownerNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/homeowner/manage') {
    return pathname === '/homeowner/manage' || pathname.startsWith('/homeowner/listings/')
  }
  if (href.includes('#')) {
    const [path] = href.split('#')
    return pathname === path || pathname.startsWith(`${path}/`)
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
