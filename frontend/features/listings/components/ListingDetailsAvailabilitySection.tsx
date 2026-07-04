'use client'

import type { Dispatch, SetStateAction, ReactNode } from 'react'
import { Calendar, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateNo } from '@/app/lib/dateFormat'
import { ListingDetailsNavMediationPanels } from '@/features/mediation/views/ListingDetailsNavView'

export type ListingDetailsAvailabilitySectionProps = {
  listing: any
  availability: any[]
  isNavView: boolean
  canOwnerEditListingDetail: boolean
  showGalleryFormidlet: boolean
  kommuneCanEdit: boolean
  ownerAgreementTerminated: boolean
  currentUser: any
  mediationReservation: any
  mediation: any
  pendingDeletePeriod: any
  setPendingDeletePeriod: (p: any) => void
  calendarMonth: Date
  setCalendarMonth: Dispatch<SetStateAction<Date>>
  getStatusForDate: (date: Date) => string | null
  formidletStart: string
  formidletEnd: string
  handleRemovePeriod: (period: any) => Promise<void>
  t: (key: any) => string
}

type PeriodStatus = 'Formidla' | 'Utilgjengelig' | 'Tilgjengelig'

function periodStatusKey(status: string): PeriodStatus {
  if (status === 'Formidla') return 'Formidla'
  if (status === 'Utilgjengelig') return 'Utilgjengelig'
  return 'Tilgjengelig'
}

function calendarCellTone(
  status: string | null,
  isInFormidletRange: boolean
): string | undefined {
  if (isInFormidletRange) return 'formidlet-range'
  if (status === 'Konflikt') return 'konflikt'
  if (status === 'Formidla') return 'formidla'
  if (status === 'Tilgjengelig') return 'tilgjengelig'
  if (status === 'Utilgjengelig') return 'utilgjengelig'
  return undefined
}

export default function ListingDetailsAvailabilitySection(
  props: ListingDetailsAvailabilitySectionProps
) {
  const {
    listing,
    availability,
    isNavView,
    canOwnerEditListingDetail,
    kommuneCanEdit,
    ownerAgreementTerminated,
    currentUser,
    mediationReservation,
    mediation,
    setPendingDeletePeriod,
    calendarMonth,
    setCalendarMonth,
    getStatusForDate,
    formidletStart,
    formidletEnd,
    t,
  } = props

  return (
    <div className="listing-availability-box">
      <h3 className="listing-availability-heading">
        <Clock size={20} /> Ledige perioder for utleie
      </h3>

      {availability.length > 0 ? (
        <div className="listing-availability-list">
          {availability.map((p) => {
            const statusKey = periodStatusKey(p.status)
            const canDelete =
              (canOwnerEditListingDetail && p.status !== 'Formidla') ||
              (isNavView && kommuneCanEdit && !ownerAgreementTerminated)

            return (
              <div
                key={p.id}
                className="listing-availability-item"
                data-status={statusKey}
              >
                <Calendar size={16} className="listing-availability-icon" />
                <span className="listing-availability-dates">
                  {formatDateNo(p.start_date)} - {formatDateNo(p.end_date)}
                </span>
                <span className="listing-availability-status" data-status={statusKey}>
                  {p.status === 'Formidla'
                    ? t('formidlet')
                    : p.status === 'Utilgjengelig'
                      ? t('unavailable')
                      : t('available')}
                </span>
                {canDelete && (
                  <button
                    type="button"
                    className="listing-availability-delete"
                    onClick={() => setPendingDeletePeriod(p)}
                    title={t('remove')}
                    aria-label={t('remove')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="listing-availability-empty">
          Ingen spesifikke ledige perioder er lagt til for denne boligen.
        </p>
      )}

      {(isNavView || availability.length > 0) && (
        <div className="listing-availability-calendar-section">
          <h4 className="listing-availability-calendar-heading">
            <Calendar size={18} /> {t('calendar')}
          </h4>
          <div className="listing-availability-cal-inner">
            <div className="listing-availability-cal-nav">
              <button
                type="button"
                className="listing-availability-cal-nav-btn"
                onClick={() =>
                  setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
                aria-label="Forrige måned"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="listing-availability-cal-month">
                {calendarMonth.toLocaleDateString('no-NO', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <button
                type="button"
                className="listing-availability-cal-nav-btn"
                onClick={() =>
                  setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
                aria-label="Neste måned"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="listing-availability-cal-grid">
              {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map((day) => (
                <div key={day} className="listing-availability-cal-weekday">
                  {day}
                </div>
              ))}
              {(() => {
                const year = calendarMonth.getFullYear()
                const month = calendarMonth.getMonth()
                const first = new Date(year, month, 1)
                const last = new Date(year, month + 1, 0)
                const startPad = (first.getDay() + 6) % 7
                const daysInMonth = last.getDate()
                const cells: ReactNode[] = []

                for (let i = 0; i < startPad; i++) {
                  cells.push(<div key={`pad-${i}`} className="listing-availability-cal-pad" />)
                }

                for (let d = 1; d <= daysInMonth; d++) {
                  const date = new Date(year, month, d)
                  const status = getStatusForDate(date)
                  const iso = date.toISOString().slice(0, 10)
                  const isInFormidletRange = Boolean(
                    formidletStart && formidletEnd && iso >= formidletStart && iso <= formidletEnd
                  )
                  const tone = calendarCellTone(status, isInFormidletRange)

                  cells.push(
                    <div
                      key={d}
                      title={status ? `${d}. ${status}` : `${d}`}
                      className="listing-availability-cal-day"
                      data-tone={tone}
                    >
                      {d}
                    </div>
                  )
                }

                return cells
              })()}
            </div>

            <div className="listing-availability-cal-legend">
              <span
                className="listing-availability-cal-legend-item"
                title={t('calendarLegendFormidletInfo')}
              >
                <span
                  className="listing-availability-cal-legend-swatch"
                  data-tone="formidla"
                />{' '}
                {t('formidlet')}
              </span>
              <span
                className="listing-availability-cal-legend-item"
                title={t('calendarLegendAvailableInfo')}
              >
                <span
                  className="listing-availability-cal-legend-swatch"
                  data-tone="tilgjengelig"
                />{' '}
                {t('available')}
              </span>
              <span
                className="listing-availability-cal-legend-item"
                title={t('calendarLegendUnavailableInfo')}
              >
                <span
                  className="listing-availability-cal-legend-swatch"
                  data-tone="utilgjengelig"
                />{' '}
                {t('unavailable')}
              </span>
              <span
                className="listing-availability-cal-legend-item"
                title={t('calendarLegendConflictInfo')}
              >
                <span
                  className="listing-availability-cal-legend-swatch"
                  data-tone="konflikt"
                />{' '}
                Konflikt
              </span>
            </div>
          </div>
        </div>
      )}

      {isNavView ? (
        <ListingDetailsNavMediationPanels
          listing={listing}
          availability={availability}
          currentUser={currentUser}
          kommuneCanEdit={kommuneCanEdit}
          ownerAgreementTerminated={ownerAgreementTerminated}
          mediationReservation={mediationReservation}
          mediation={mediation}
          t={t}
        />
      ) : null}
    </div>
  )
}
