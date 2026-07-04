'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { isKommuneSocialActiveForCity } from '@/app/lib/kommuneSocialSubscription'
import '@/features/listings/landlord-manage.css'

type LandlordNonSubscribedBannerProps = {
  city?: string | null
}

/**
 * PRD §6.2 L-7 — kommune without social mediation subscription.
 */
export default function LandlordNonSubscribedBanner({ city }: LandlordNonSubscribedBannerProps) {
  const { t } = useLanguage()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const trimmed = city?.trim()
    if (!trimmed) {
      setShow(false)
      return
    }
    let cancelled = false
    void isKommuneSocialActiveForCity(supabase, trimmed).then((active) => {
      if (!cancelled) setShow(!active)
    })
    return () => {
      cancelled = true
    }
  }, [city])

  if (!show) return null

  return (
    <div
      className="card hrt-callout hrt-callout--accent hm-banner-spaced"
      role="status"
    >
      <strong>{t('landlordNonSubscribedTitle')}</strong>
      <p className="hm-banner-body">{t('landlordNonSubscribedBody')}</p>
      <Link href="/homeowner/agreements" className="button button-accent hm-banner-cta">
        {t('landlordNonSubscribedTourismCta')}
      </Link>
    </div>
  )
}
