'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { isKommuneSocialActiveForCity } from '@/app/lib/kommuneSocialSubscription'

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
      className="card"
      role="status"
      style={{
        marginBottom: 'var(--space-4)',
        padding: 'var(--space-4)',
        borderLeft: '4px solid var(--color-accent)',
      }}
    >
      <strong>{t('landlordNonSubscribedTitle')}</strong>
      <p style={{ margin: 'var(--space-2) 0 var(--space-3)', lineHeight: 1.55 }}>
        {t('landlordNonSubscribedBody')}
      </p>
      <Link href="/homeowner/agreements" className="button button-accent" style={{ textDecoration: 'none' }}>
        {t('landlordNonSubscribedTourismCta')}
      </Link>
    </div>
  )
}
