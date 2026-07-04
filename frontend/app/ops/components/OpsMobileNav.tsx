'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Megaphone, MoreHorizontal } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { OPS_MOBILE_PRIMARY, isOpsNavActive } from '../lib/opsNav'

export default function OpsMobileNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <nav className="ops-mobile-nav" aria-label={t('opsConsoleTitle')}>
      {OPS_MOBILE_PRIMARY.map((item) => {
        const Icon = item.icon
        const active = isOpsNavActive(pathname ?? '', item.href, item.exact)
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
      <Link
        href="/ops/broadcasts"
        className={`ops-mobile-nav-item${
          isOpsNavActive(pathname ?? '', '/ops/broadcasts') ? ' ops-mobile-nav-item--active' : ''
        }`}
      >
        <Megaphone size={20} aria-hidden />
        <span>{t('opsNavBroadcasts')}</span>
      </Link>
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
