'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, BarChart3, Building2, HeartPulse } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'

const ITEMS = [
  { href: '/ops', icon: LayoutDashboard, labelKey: 'opsNavDashboard' as const, exact: true },
  { href: '/ops/kommuner', icon: Building2, labelKey: 'opsNavKommuner' as const },
  { href: '/ops/accounts', icon: Users, labelKey: 'opsNavAccounts' as const },
  { href: '/ops/health', icon: HeartPulse, labelKey: 'opsNavHealth' as const },
  { href: '/ops/stats', icon: BarChart3, labelKey: 'opsNavStats' as const },
]

export default function OpsMobileNav() {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <nav className="ops-mobile-nav" aria-label={t('opsConsoleTitle')}>
      {ITEMS.map((item) => {
        const Icon = item.icon
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname?.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`ops-mobile-nav-item${active ? ' ops-mobile-nav-item--active' : ''}`}
          >
            <Icon size={20} aria-hidden />
            <span>{t(item.labelKey)}</span>
          </Link>
        )
      })}
    </nav>
  )
}
