'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'
import { usePlatformMode } from '@/context/PlatformModeContext'
import LandlordBookingRequests from '@/features/bookings/components/LandlordBookingRequests'
import LandlordStripeConnect from '@/features/bookings/components/LandlordStripeConnect'
import { useLandlordListingsQuery } from '@/features/listings/hooks/useLandlordListingsQuery'
import '@/features/listings/landlord-manage.css'

export default function LandlordBookingsPage() {
  const { t } = useLanguage()
  const { flags: platformFlags } = usePlatformMode()
  const router = useRouter()
  const onboardingRef = useRef(null)
  const { myListings, loading } = useLandlordListingsQuery({
    router,
    centralEvents: platformFlags.centralEvents,
    onboardingRef,
  })

  useEffect(() => {
    if (!platformFlags.stripeBookings) {
      router.replace('/homeowner/manage')
    }
  }, [platformFlags.stripeBookings, router])

  if (!platformFlags.stripeBookings) {
    return <LoadingPlaceholder minHeight={240} />
  }

  return (
    <main className="hm-page">
      <div className="hm-header-row">
        <div>
          <h1 className="hm-page-title">{t('homeownerNavBookings')}</h1>
        </div>
      </div>

      <LandlordStripeConnect />

      {loading ? (
        <LoadingPlaceholder minHeight={120} />
      ) : (
        <LandlordBookingRequests listingIds={myListings.map((l) => l.id)} />
      )}
    </main>
  )
}
