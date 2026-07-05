// mobile-decision: Dedicated /finn/map route — full-screen map tab with clean active state vs embedded search toggle.
'use client'

import Link from 'next/link'
import { List } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import FinnTourismMap from '@/features/tourism/components/FinnTourismMap'
import MobilePageTransition from '@/components/layout/mobile-page-transition'

export default function FinnMapPage() {
  const { t } = useLanguage()

  return (
    <MobilePageTransition>
      <div className="finn-map-page">
        <div className="finn-map-page__map">
          <FinnTourismMap />
        </div>
        <div className="finn-map-page__footer">
          <Link href="/finn" className="button finn-map-page__list-btn">
            <List size={18} aria-hidden />
            {t('finnMapShowList')}
          </Link>
        </div>
      </div>
    </MobilePageTransition>
  )
}
