'use client'

import { useEffect, useMemo, useState } from 'react'
import { Compass, Sparkles } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import AccordionWithChevron from '@/app/components/design-system/AccordionWithChevron'
import ListingTourismSettings from '@/features/listings/components/ListingTourismSettings'
import ListingCoHostsPanel from '@/features/listings/components/ListingCoHostsPanel'
import ListingEventOptIn from '@/features/listings/components/ListingEventOptIn'
import LandlordStripeConnect from '@/features/bookings/components/LandlordStripeConnect'

type ListingPatch = {
  tourism_enabled: boolean
  tourism_nightly_price_cents: number | null
  tourism_instant_book?: boolean
  cancellation_policy?: string
  tourism_check_in_guide?: string | null
}

type Props = {
  listing: {
    id: string
    tourism_enabled?: boolean | null
    tourism_nightly_price_cents?: number | null
    tourism_instant_book?: boolean | null
    cancellation_policy?: string | null
    tourism_check_in_guide?: string | null
  }
  tourism: boolean
  centralEvents: boolean
  stripeBookings: boolean
  openSection: string | null
  onListingUpdated: (patch: Partial<ListingPatch>) => void
}

export default function ListingHubSettingsAccordion({
  listing,
  tourism,
  centralEvents,
  stripeBookings,
  openSection,
  onListingUpdated,
}: Props) {
  const { t } = useLanguage()
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (openSection === 'tourism' && tourism) {
      setOpenId('tourism')
      return
    }
    if (openSection === 'events' && centralEvents) {
      setOpenId('events')
      return
    }
    if (!openSection) {
      setOpenId(null)
    }
  }, [openSection, tourism, centralEvents])

  const items = useMemo(
    () => [
      {
        id: 'tourism',
        domId: 'hub-tourism',
        title: t('managePanelTourism'),
        icon: <Compass size={18} aria-hidden />,
        hidden: !tourism,
        content: (
          <>
            <ListingTourismSettings
              listingId={listing.id}
              initialEnabled={Boolean(listing.tourism_enabled)}
              initialNightlyPriceCents={
                typeof listing.tourism_nightly_price_cents === 'number'
                  ? listing.tourism_nightly_price_cents
                  : null
              }
              initialInstantBook={Boolean(listing.tourism_instant_book)}
              initialCancellationPolicy={listing.cancellation_policy ?? 'moderate'}
              initialCheckInGuide={
                typeof listing.tourism_check_in_guide === 'string'
                  ? listing.tourism_check_in_guide
                  : null
              }
              onUpdated={(patch) => onListingUpdated(patch)}
            />
            {listing.tourism_enabled && stripeBookings ? <LandlordStripeConnect /> : null}
            {listing.tourism_enabled ? <ListingCoHostsPanel listingId={listing.id} /> : null}
          </>
        ),
      },
      {
        id: 'events',
        domId: 'hub-events',
        title: t('managePanelEvents'),
        icon: <Sparkles size={18} aria-hidden />,
        hidden: !centralEvents,
        content: <ListingEventOptIn listingId={listing.id} />,
      },
    ],
    [centralEvents, listing, onListingUpdated, stripeBookings, t, tourism]
  )

  if (!tourism && !centralEvents) return null

  return (
    <section className="listing-hub-settings" aria-labelledby="listing-hub-settings-title">
      <h3 id="listing-hub-settings-title" className="listing-hub-settings-title">
        {t('listingHubSettingsTitle')}
      </h3>

      <AccordionWithChevron
        items={items}
        openId={openId}
        onOpenChange={setOpenId}
        ariaLabel={t('listingHubAccordionAria')}
        getExpandLabel={(title) => t('accordionExpandSection').replace('{title}', title)}
        getCollapseLabel={(title) => t('accordionCollapseSection').replace('{title}', title)}
      />
    </section>
  )
}
