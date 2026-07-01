'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, Compass, CalendarDays } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import SharedAvailabilityCalendar from '@/features/listings/components/SharedAvailabilityCalendar'
import LanePeriodBadge from '@/features/listings/components/LanePeriodBadge'
import { formatDateNo } from '@/app/lib/dateFormat'
import {
  landlordOpenClosePeriods,
  listingAvailabilityStatusToday,
} from '@/app/lib/listingAvailabilityStatusToday'
import type { ListingEventOptInPeriod } from '@/features/listings/types/lanes'

type PeriodRow = {
  id: string
  start_date: string
  end_date: string
  status: string
  lane?: string | null
}

export type LandlordAvailabilityMode = 'sosial' | 'turisme' | 'arrangement'

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
    status: string
  ) => Promise<void>
  onDeletePeriod: (periodId: string, listingId: string) => void
  onRefreshEvents: () => Promise<void>
  onOpenTourismSettings: () => void
}

export default function LandlordAvailabilityHub({
  listing,
  periods,
  eventOptIns,
  showTourism,
  showEvents,
  onAddPeriod,
  onDeletePeriod,
  onOpenTourismSettings,
}: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const [mode, setMode] = useState<LandlordAvailabilityMode>('sosial')
  const [paintStatus, setPaintStatus] = useState<'Tilgjengelig' | 'Utilgjengelig'>('Tilgjengelig')
  const [selStart, setSelStart] = useState<string | null>(null)
  const [selEnd, setSelEnd] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  const tourismEnabled = Boolean(listing.tourism_enabled)
  const openClosePeriods = landlordOpenClosePeriods(periods)
  const todayStatus = listingAvailabilityStatusToday(listing.id, { [listing.id]: periods })

  const applySharedPeriod = async (
    start: string,
    end: string,
    status: 'Tilgjengelig' | 'Utilgjengelig'
  ) => {
    setApplying(true)
    try {
      await onAddPeriod(listing.id, start, end, status)
      toast(t('sharedCalendarSaved'), 'success')
      setSelStart(null)
      setSelEnd(null)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : t('errSaveListing'), 'error')
    } finally {
      setApplying(false)
    }
  }

  const modes = (
    [
      { id: 'sosial' as const, label: t('availModeSocial'), icon: Building2, show: true },
      { id: 'turisme' as const, label: t('availModeTourism'), icon: Compass, show: showTourism },
      { id: 'arrangement' as const, label: t('availModeEvent'), icon: CalendarDays, show: showEvents },
    ] as const
  ).filter((m) => m.show)

  return (
    <div className="landlord-availability-hub">
      <div className="avail-mode-tabs" role="tablist" aria-label={t('availModeTabsAria')}>
        {modes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            className={`avail-mode-tab${mode === id ? ' avail-mode-tab--active' : ''}`}
            onClick={() => setMode(id)}
          >
            <Icon size={20} aria-hidden />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div
        className={`avail-today-banner avail-today-banner--${todayStatus === 'Ikke markert' ? 'unmarked' : todayStatus === 'Tilgjengelig' ? 'open' : todayStatus === 'Utilgjengelig' ? 'closed' : 'mediated'}`}
        role="status"
      >
        <strong>{t('availTodayLabel')}</strong>
        <span>
          {todayStatus === 'Ikke markert'
            ? t('availabilityUnmarked')
            : todayStatus === 'Formidla'
              ? t('formidlet')
              : todayStatus === 'Utilgjengelig'
                ? t('unavailable')
                : t('available')}
        </span>
      </div>

      {mode === 'sosial' ? (
        <div className="avail-mode-panel">
          <p className="avail-mode-desc">{t('availModeSocialDesc')}</p>
          <SharedAvailabilityCalendar
            periods={periods}
            eventOptIns={eventOptIns}
            paintStatus={paintStatus}
            onPaintStatusChange={setPaintStatus}
            selectionStart={selStart}
            selectionEnd={selEnd}
            onSelectionChange={(s, e) => {
              setSelStart(s)
              setSelEnd(e)
            }}
            onApply={applySharedPeriod}
            applying={applying}
          />
        </div>
      ) : null}

      {mode === 'turisme' ? (
        <div className="avail-mode-panel">
          {!tourismEnabled ? (
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
          ) : (
            <>
              <p className="avail-mode-desc">{t('availModeTourismDesc')}</p>
              <SharedAvailabilityCalendar
                periods={periods}
                eventOptIns={eventOptIns}
                paintStatus={paintStatus}
                onPaintStatusChange={setPaintStatus}
                selectionStart={selStart}
                selectionEnd={selEnd}
                onSelectionChange={(s, e) => {
                  setSelStart(s)
                  setSelEnd(e)
                }}
                onApply={applySharedPeriod}
                applying={applying}
              />
            </>
          )}
        </div>
      ) : null}

      {mode === 'arrangement' ? (
        <div className="avail-mode-panel">
          <p className="avail-mode-desc">{t('availModeEventDesc')}</p>
          {eventOptIns.length > 0 ? (
            <ul className="avail-event-optin-list">
              {eventOptIns.map((e) => (
                <li key={e.event_id}>
                  <strong>{e.event_name}</strong>
                  <span>
                    {formatDateNo(e.start_date)} – {formatDateNo(e.end_date)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="landlord-period-empty">{t('availModeEventEmpty')}</p>
          )}
          <p className="landlord-events-calendar-note">
            {t('availModeEventCta')}{' '}
            <Link href={`/homeowner/manage?listing=${listing.id}&panel=events`} className="nav-link">
              {t('managePanelEvents')}
            </Link>
          </p>
        </div>
      ) : null}

      <div className="landlord-period-list">
        <h5 className="landlord-period-list-title">{t('sharedPeriodListTitle')}</h5>
        {openClosePeriods.length > 0 ? (
          <ul className="landlord-period-list-items">
            {openClosePeriods.map((p) => (
              <li key={p.id} className="hm-period-item landlord-period-list-row">
                <span className="hm-period-dates">
                  {formatDateNo(p.start_date)} – {formatDateNo(p.end_date)}
                </span>
                <LanePeriodBadge lane="shared" status={p.status ?? 'Tilgjengelig'} />
                <button
                  type="button"
                  className="landlord-period-delete"
                  onClick={() => onDeletePeriod(String(p.id), listing.id)}
                  title={t('manageDeletePeriodTitle')}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="landlord-period-empty">{t('sharedPeriodListEmpty')}</p>
        )}

        {periods.some((p) => p.status === 'Formidla') ? (
          <div className="avail-formidla-block">
            <h6>{t('availFormidlaTitle')}</h6>
            <ul className="landlord-period-list-items">
              {periods
                .filter((p) => p.status === 'Formidla')
                .map((p) => (
                  <li key={p.id} className="hm-period-item landlord-period-list-row">
                    <span className="hm-period-dates">
                      {formatDateNo(p.start_date)} – {formatDateNo(p.end_date)}
                    </span>
                    <LanePeriodBadge lane="sosial" status="Formidla" />
                    <span className="landlord-period-kommune-note">{t('formidlaKommuneOnly')}</span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
