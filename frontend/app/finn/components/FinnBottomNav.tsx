'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Inbox, Search, User, Luggage } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

const FINN_TABS = [
  { href: '/finn', labelKey: 'finnNavExplore', icon: Search, match: (p: string) => p === '/finn' || p === '/finn/', badge: false },
  { href: '/finn/mine', labelKey: 'finnNavTrips', icon: Luggage, match: (p: string) => p.startsWith('/finn/mine') || p.startsWith('/finn/book'), badge: false },
  { href: '/finn/hosting', labelKey: 'finnNavHosting', icon: Building2, match: (p: string) => p.startsWith('/finn/hosting'), badge: false },
  { href: '/finn/inbox', labelKey: 'finnNavInbox', icon: Inbox, match: (p: string) => p.startsWith('/finn/inbox'), badge: true },
  { href: '/finn/profile', labelKey: 'finnNavProfile', icon: User, match: (p: string) => p.startsWith('/finn/profile') || p.startsWith('/finn/login'), badge: false },
] as const

type FinnBottomNavProps = {
  unreadCount?: number
}

export default function FinnBottomNav({ unreadCount = 0 }: FinnBottomNavProps) {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <nav className="finn-bottom-nav" aria-label={t('finnMainNav')}>
      {FINN_TABS.map(({ href, labelKey, icon: Icon, match, badge }) => {
        const active = match(pathname ?? '')
        return (
          <Link
            key={href}
            href={href}
            className={`finn-bottom-nav__btn${active ? ' finn-bottom-nav__btn--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={1.8} aria-hidden />
            <span>{t(labelKey)}</span>
            {badge && unreadCount > 0 ? (
              <span className="finn-bottom-nav__count" aria-label={t('finnUnreadMessages')}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : badge ? (
              <span className="finn-bottom-nav__badge" aria-hidden />
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
