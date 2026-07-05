'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { enGB, nb } from 'react-day-picker/locale'
import { useLanguage } from '@/context/LanguageContext'
import { CalendarWithRangeSelection, localDateToYmd } from '@/app/components/ui/calendar-with-range-selection'
import { useTourismListingCalendarData } from '@/features/tourism/hooks/useTourismListingCalendarData'
import {
  isNightBooked,
  isTourismDaySelectable,
  tourismDayStatus,
} from '@/features/tourism/lib/tourismCalendarModel'

type Props = {
  listingId: string
  checkIn: string
  checkOut: string
  onChange: (next: { checkIn: string; checkOut: string }) => void
  onDatesBlocked?: (blocked: boolean) => void
  minNights?: number
  maxNights?: number
}

/** Northern Sámi falls back to Bokmål — react-day-picker has no `se` locale. */
const dayPickerLocale = {
  no: nb,
  se: nb,
  en: enGB,
} as const

export default function TourismBookingCalendar({
  listingId,
  checkIn,
  checkOut,
  onChange,
  onDatesBlocked,
  minNights = 2,
  maxNights = 20,
}: Props) {
  const { t, locale } = useLanguage()
  const { periods, blockedRanges, bookingsFetchFailed, loading } = useTourismListingCalendarData(listingId)
  const [months, setMonths] = useState(2)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const sync = () => setMonths(mq.matches ? 2 : 1)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const statusForDay = useCallback(
    (date: Date) => tourismDayStatus(listingId, periods, localDateToYmd(date)),
    [listingId, periods]
  )

  const modifiers = useMemo(
    () => ({
      available: (date: Date) => statusForDay(date) === 'Tilgjengelig' && !isNightBooked(localDateToYmd(date), blockedRanges),
      booked: (date: Date) => isNightBooked(localDateToYmd(date), blockedRanges),
      outside: (date: Date) => statusForDay(date) !== 'Tilgjengelig',
    }),
    [statusForDay, blockedRanges]
  )

  const modifiersClassNames = useMemo(
    () => ({
      available: 'tourist-day--available',
      booked: 'tourist-day--booked [&>button]:line-through',
      outside: 'tourist-day--outside',
    }),
    []
  )

  const disabledDays = useCallback(
    (date: Date) => !isTourismDaySelectable(listingId, periods, blockedRanges, date, bookingsFetchFailed),
    [listingId, periods, blockedRanges, bookingsFetchFailed]
  )

  const hasSelection = Boolean(checkIn && checkOut && checkOut >= checkIn)
  const selectionOk =
    !hasSelection ||
    (() => {
      const start = new Date(checkIn)
      const end = new Date(checkOut)
      const cursor = new Date(start)
      while (cursor < end) {
        if (!isTourismDaySelectable(listingId, periods, blockedRanges, cursor, bookingsFetchFailed)) {
          return false
        }
        cursor.setDate(cursor.getDate() + 1)
      }
      return true
    })()

  useEffect(() => {
    onDatesBlocked?.(hasSelection ? !selectionOk : false)
  }, [hasSelection, selectionOk, onDatesBlocked])

  if (loading) {
    return <p className="finn-card-meta">{t('loadingPleaseWait')}</p>
  }

  const defaultMonth = checkIn
    ? new Date(Number(checkIn.slice(0, 4)), Number(checkIn.slice(5, 7)) - 1, 1)
    : periods.find((p) => p.status === 'Tilgjengelig')
      ? new Date(Number(periods[0].start_date.slice(0, 4)), Number(periods[0].start_date.slice(5, 7)) - 1, 1)
      : new Date()

  return (
    <div className="tourism-booking-calendar">
      {bookingsFetchFailed ? (
        <div className="tourism-booking-calendar__warning" role="alert">
          <AlertTriangle size={16} aria-hidden />
          <span>{t('finnCalendarBookingsIncomplete')}</span>
        </div>
      ) : null}

      <CalendarWithRangeSelection
        variant="tourist"
        checkIn={checkIn}
        checkOut={checkOut}
        onChange={onChange}
        numberOfMonths={months}
        minNights={minNights}
        maxNights={maxNights}
        disabled={disabledDays}
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        defaultMonth={defaultMonth}
        locale={dayPickerLocale[locale]}
        hint={t('rangeCalendarStayHint').replace('{min}', String(minNights)).replace('{max}', String(maxNights))}
        calendarClassName="mx-auto w-full max-w-full"
      />

      <ul className="tourism-booking-calendar__legend" aria-label={t('calendarLegend')}>
        <li>
          <span className="tourism-booking-calendar__swatch tourism-booking-calendar__swatch--available" />
          {t('finnCalendarLegendAvailable')}
        </li>
        <li>
          <span className="tourism-booking-calendar__swatch tourism-booking-calendar__swatch--booked" />
          {t('finnCalendarLegendBooked')}
        </li>
        <li>
          <span className="tourism-booking-calendar__swatch tourism-booking-calendar__swatch--outside" />
          {t('finnCalendarLegendOutside')}
        </li>
      </ul>

      {hasSelection && !selectionOk ? (
        <p className="tourism-booking-calendar__error" role="alert">
          {t('finnDatesNotAvailable')}
        </p>
      ) : null}
    </div>
  )
}
