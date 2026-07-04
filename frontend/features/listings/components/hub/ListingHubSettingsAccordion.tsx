'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Compass, Sparkles } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import ListingTourismSettings from '@/features/listings/components/ListingTourismSettings'
import ListingCoHostsPanel from '@/features/listings/components/ListingCoHostsPanel'
import ListingEventOptIn from '@/features/listings/components/ListingEventOptIn'

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
  openSection: string | null
  onListingUpdated: (patch: Partial<ListingPatch>) => void
}

function AccordionSection({
  id,
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  id: string
  title: string
  icon: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [open])

  return (
    <div className={`listing-hub-accordion${open ? ' listing-hub-accordion--open' : ''}`}>
      <button
        type="button"
        id={`${id}-trigger`}
        className="listing-hub-accordion-trigger"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
      >
        <span className="listing-hub-accordion-trigger-main">
          {icon}
          {title}
        </span>
        <ChevronDown size={18} aria-hidden className="listing-hub-accordion-chevron" />
      </button>
      {open ? (
        <div
          id={`${id}-panel`}
          role="region"
          aria-labelledby={`${id}-trigger`}
          ref={panelRef}
          className="listing-hub-accordion-panel"
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

function useSectionOpen(sectionId: string, openSection: string | null) {
  const [open, setOpen] = useState(openSection === sectionId)
  useEffect(() => {
    setOpen(openSection === sectionId)
  }, [openSection, sectionId])
  return [open, setOpen] as const
}

export default function ListingHubSettingsAccordion({
  listing,
  tourism,
  centralEvents,
  openSection,
  onListingUpdated,
}: Props) {
  const { t } = useLanguage()
  const [tourismOpen, setTourismOpen] = useSectionOpen('tourism', openSection)
  const [eventsOpen, setEventsOpen] = useSectionOpen('events', openSection)

  return (
    <div className="listing-hub-settings">
      <h3 className="listing-hub-settings-title">{t('listingHubSettingsTitle')}</h3>

      {tourism ? (
        <AccordionSection
          id="hub-tourism"
          title={t('managePanelTourism')}
          icon={<Compass size={18} aria-hidden />}
          open={tourismOpen}
          onToggle={() => setTourismOpen((v) => !v)}
        >
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
          {listing.tourism_enabled ? <ListingCoHostsPanel listingId={listing.id} /> : null}
        </AccordionSection>
      ) : null}

      {centralEvents ? (
        <AccordionSection
          id="hub-events"
          title={t('managePanelEvents')}
          icon={<Sparkles size={18} aria-hidden />}
          open={eventsOpen}
          onToggle={() => setEventsOpen((v) => !v)}
        >
          <ListingEventOptIn listingId={listing.id} />
        </AccordionSection>
      ) : null}
    </div>
  )
}
