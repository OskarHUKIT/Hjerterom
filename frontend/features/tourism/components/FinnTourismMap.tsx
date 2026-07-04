'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { PageSkeleton } from '@/app/components/design-system'

type Pin = {
  id: string
  address: string
  city: string
  map_lat: number
  map_lng: number
  tourism_nightly_price_cents: number | null
}

const MapInner = dynamic(() => import('./FinnTourismMapInner'), {
  ssr: false,
  loading: () => <PageSkeleton minHeight={280} />,
})

type Props = {
  city?: string
}

export default function FinnTourismMap({ city }: Props) {
  const { t } = useLanguage()
  const [pins, setPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const { data } = await supabase.rpc('list_tourism_map_pins', {
        p_city: city?.trim() || null,
      })
      setPins((data ?? []) as Pin[])
      setLoading(false)
    })()
  }, [city])

  if (loading) return <PageSkeleton minHeight={280} />

  if (pins.length === 0) {
    return (
      <p className="finn-card-meta" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
        {t('finnMapNoPins')}
      </p>
    )
  }

  return (
    <div className="finn-map-wrap" style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 'var(--space-6)' }}>
      <MapInner pins={pins} />
    </div>
  )
}
