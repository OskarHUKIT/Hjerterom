'use client'

import Link from 'next/link'
import { Home } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

export default function FinnBrandMark() {
  const { t } = useLanguage()

  return (
    <Link href="/finn" className="finn-brand-mark" aria-label={t('finnBrand')}>
      <span className="finn-brand-mark__icon" aria-hidden>
        <Home size={16} strokeWidth={2.5} />
      </span>
      <span>
        <p className="finn-brand-mark__title">{t('finnAppTitle')}</p>
        <p className="finn-brand-mark__lane">{t('finnAppLane')}</p>
      </span>
    </Link>
  )
}
