'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Building2, MoreHorizontal } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'

const PRIMARY = [
  { href: '/ops', icon: LayoutDashboard, labelKey: 'opsNavDashboard' as const, exact: true },
  { href: '/ops/kommuner', icon: Building2, labelKey: 'opsNavKommuner' as const },
  { href: '/ops/accounts', icon: Users, labelKey: 'opsNavAccounts' as const },
] as const

export default function OpsMobileNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <nav className="ops-mobile-nav" aria-label={t('opsConsoleTitle')}>
      {PRIMARY.map((item) => {
        const Icon = item.icon
        const active =
          'exact' in item && item.exact
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
      <button
        type="button"
        className="ops-mobile-nav-item ops-mobile-nav-item--menu"
        onClick={onOpenMenu}
        aria-label={t('opsOpenMenu')}
      >
        <MoreHorizontal size={20} aria-hidden />
        <span>{t('opsMoreNav')}</span>
      </button>
    </nav>
  )
}
