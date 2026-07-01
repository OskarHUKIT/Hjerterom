'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Compass } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { getAuthUserDeduped, supabase } from '@/app/lib/supabase'
import ListingLaneCalendar from '@/features/listings/components/ListingLaneCalendar'
import LanePeriodBadge from '@/features/listings/components/LanePeriodBadge'
import AvailabilityLaneSelect from '@/features/listings/components/AvailabilityLaneSelect'
import { DateInput } from '@/app/components/DateInput'
import { formatDateNo } from '@/app/lib/dateFormat'
import { dayAvailabilityToneForIso } from '@/app/lib/listingDayAvailabilityTone'
import type { ListingLane, ListingPaintLane } from '@/features/listings/types/lanes'
import {
  eventsOverlappingRange,
  normalizeSelection,
} from '@/features/listings/lib/laneCalendarModel'
import type { ListingEventOptInPeriod } from '@/features/listings/types/lanes'

type PeriodRow = {
  id: string
  start_date: string
  end_date: string
  status: string
  lane?: string | null
}

type Props = {
  listing: {
    id: string
    tourism_enabled?: boolean | null
  }
  periods: PeriodRow[]
  eventOptIns: ListingEventOptInPeriod[]
  allPublishedEvents: ListingEventOptInPeriod[]
  showTourism: boolean
  showEvents: boolean
  onAddPeriod: (
    listingId: string,
    start: string,
    end: string,
    status: string,
    lane: ListingLane
  ) => Promise<void>
  onDeletePeriod: (periodId: string, listingId: string) => void
  onRefreshEvents: () => Promise<void>
  onOpenTourismSettings: () => void
}

export default function LandlordAvailabilityHub({
  listing,
  periods,
  eventOptIns,
  allPublishedEvents,
  showTourism,
  showEvents,
  onAddPeriod,
  onDeletePeriod,
  onRefreshEvents,
  onOpenTourismSettings,
}: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const [paintLane, setPaintLane] = useState<ListingPaintLane>('sosial')
  const [paintStatus, setPaintStatus] = useState<'Tilgjengelig' | 'Utilgjengelig'>('Tilgjengelig')
  const [selStart, setSelStart] = useState<string | null>(null)
  const [selEnd, setSelEnd] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manual, setManual] = useState({
    start: '',
    end: '',
    status: 'Tilgjengelig',
    lane: 'sosial' as ListingLane,
  })

  const tourismEnabled = Boolean(listing.tourism_enabled)

  const applySelection = async () => {
    if (!selStart || !selEnd) return
    const { start, end } = normalizeSelection(selStart, selEnd)
    setApplying(true)
    try {
      if (paintLane === 'event') {
        const overlapping = eventsOverlappingRange(allPublishedEvents, start, end)
        if (overlapping.length === 0) {
          toast(t('laneCalendarNoEventInRange'), 'error')
          return
        }
        if (overlapping.length > 1) {
          toast(t('laneCalendarMultipleEvents'), 'error')
          return
        }
        const event = overlapping[0]
        const user = await getAuthUserDeduped()
        if (user?.id) {
          const { data: termsOk } = await supabase.rpc('landlord_has_event_terms_signed', {
            p_user_id: user.id,
            p_event_id: event.event_id,
          })
          if (termsOk === false) {
            toast(t('eventOptInTermsRequired'), 'error')
            return
          }
        }
        const { error } = await supabase.from('listing_event_availability').upsert(
          [
            {
              listing_id: listing.id,
              event_id: event.event_id,
              available_from: event.start_date,
              available_to: event.end_date,
              status: 'active',
            },
          ],
          { onConflict: 'listing_id,event_id' }
        )
        if (error) throw error
        await onRefreshEvents()
        toast(t('eventOptInSuccess'), 'success')
      } else {
        if (paintLane === 'turisme' && !tourismEnabled) {
          toast(t('tourismEnabledRequired'), 'error')
          return
        }
        await onAddPeriod(listing.id, start, end, paintStatus, paintLane)
        toast(t('laneCalendarApplied'), 'success')
      }
      setSelStart(null)
      setSelEnd(null)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : t('errSaveListing'), 'error')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="landlord-availability-hub">
      {showTourism && !tourismEnabled ? (
        <div className="landlord-tourism-enable-banner">
          <div className="landlord-tourism-enable-banner-text">
            <Compass size={20} aria-hidden />
            <div>
              <strong>{t('tourismEnableBannerTitle')}</strong>
              <p>{t('tourismEnableBannerBody')}</p>
            </div>
          </div>
          <button type="button" className="button button-accent" onClick={onOpenTourismSettings}>
            {t('tourismEnableBannerCta')}
          </button>
        </div>
      ) : null}

      <ListingLaneCalendar
        periods={periods.map((p) => ({
          id: p.id,
          start_date: p.start_date,
          end_date: p.end_date,
          status: p.status,
          lane: p.lane,
        }))}
        eventOptIns={eventOptIns}
        tourismEnabled={tourismEnabled}
        showTourism={showTourism}
        showEvents={showEvents}
        paintLane={paintLane}
        onPaintLaneChange={setPaintLane}
        paintStatus={paintStatus}
        onPaintStatusChange={setPaintStatus}
        selectionStart={selStart}
        selectionEnd={selEnd}
        onSelectionChange={(start, end) => {
          setSelStart(start)
          setSelEnd(end)
        }}
        onApply={() => void applySelection()}
        applying={applying}
      />

      <div className="landlord-period-list">
        <h5 className="landlord-period-list-title">{t('availablePeriods')}</h5>
        {periods.length > 0 ? (
          <ul className="landlord-period-list-items">
            {periods.map((p) => (
              <li key={p.id} className="hm-period-item landlord-period-list-row">
                <span className="hm-period-dates">
                  {formatDateNo(p.start_date)} – {formatDateNo(p.end_date)}
                </span>
                <LanePeriodBadge lane={p.lane} status={p.status} />
                {p.status !== 'Formidla' ? (
                  <button
                    type="button"
                    className="landlord-period-delete"
                    onClick={() => onDeletePeriod(p.id, listing.id)}
                    title={t('manageDeletePeriodTitle')}
                  >
                    ×
                  </button>
                ) : (
                  <span className="landlord-period-kommune-note">{t('formidlaKommuneOnly')}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="landlord-period-empty">{t('noPeriods')}</p>
        )}
      </div>

      <details
        className="landlord-manual-period"
        open={manualOpen}
        onToggle={(e) => setManualOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary>{t('laneManualPeriodSummary')}</summary>
        <div className="hm-add-period-row landlord-manual-period-form">
          {showTourism && tourismEnabled ? (
            <div style={{ flex: '1 1 100%', minWidth: 160 }}>
              <AvailabilityLaneSelect
                id={`lane-manual-${listing.id}`}
                value={manual.lane}
                onChange={(lane) => setManual({ ...manual, lane })}
              />
            </div>
          ) : null}
          <div style={{ flex: 1 }}>
            <label className="label" style={{ fontSize: '0.7rem' }}>
              {t('status')}
            </label>
            <select
              className="input"
              style={{ marginBottom: 0, fontSize: '0.85rem' }}
              value={manual.status}
              onChange={(e) => setManual({ ...manual, status: e.target.value })}
            >
              <option value="Tilgjengelig">{t('available')}</option>
              <option value="Utilgjengelig">{t('unavailable')}</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ fontSize: '0.7rem' }}>
              {t('fromDate')}
            </label>
            <DateInput
              showCalendar
              className="input"
              style={{ marginBottom: 0, fontSize: '0.85rem' }}
              value={manual.start}
              onChange={(v) => setManual({ ...manual, start: v })}
              max={manual.end || undefined}
              placeholder={t('dateInputPlaceholder')}
              calendarDayTone={(iso) => dayAvailabilityToneForIso(iso, periods)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label" style={{ fontSize: '0.7rem' }}>
              {t('toDate')}
            </label>
            <DateInput
              showCalendar
              className="input"
              style={{ marginBottom: 0, fontSize: '0.85rem' }}
              value={manual.end}
              onChange={(v) => setManual({ ...manual, end: v })}
              min={manual.start || undefined}
              placeholder={t('dateInputPlaceholder')}
              calendarDayTone={(iso) => dayAvailabilityToneForIso(iso, periods)}
            />
          </div>
          <button
            type="button"
            className="button"
            onClick={() => {
              void onAddPeriod(listing.id, manual.start, manual.end, manual.status, manual.lane).then(
                () => setManual({ start: '', end: '', status: 'Tilgjengelig', lane: 'sosial' })
              )
            }}
          >
            {t('add')}
          </button>
        </div>
      </details>

      {showEvents ? (
        <p className="landlord-events-calendar-note">
          {t('laneCalendarEventListHint')}{' '}
          <Link href={`/homeowner/manage?listing=${listing.id}&panel=events`} className="nav-link">
            {t('managePanelEvents')}
          </Link>
        </p>
      ) : null}
    </div>
  )
}
