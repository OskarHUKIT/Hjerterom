'use client'

import type { Dispatch, SetStateAction, ReactNode } from 'react'
import { Calendar, Info, Trash2, Plus, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { DateInput } from '@/app/components/DateInput'
import { formatDateNo } from '@/app/lib/dateFormat'
import { dayAvailabilityToneForIso } from '@/app/lib/listingDayAvailabilityTone'
import { ListingDetailsNavMediationPanels } from '@/features/mediation/views/ListingDetailsNavView'
import type { TranslationKey } from '@/lib/translations'

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

export default function ListingDetailsAvailabilitySection(props: ListingDetailsAvailabilitySectionProps) {
  const { listing, availability, isNavView, canOwnerEditListingDetail, showGalleryFormidlet, kommuneCanEdit, ownerAgreementTerminated, currentUser, mediationReservation, mediation, pendingDeletePeriod, setPendingDeletePeriod, calendarMonth, setCalendarMonth, getStatusForDate, formidletStart, formidletEnd, handleRemovePeriod, t } = props
  return (
    <>
{/* 4. Ledige perioder og kalender */}
<div
  className="listing-availability-box"
  style={{
    padding: 'var(--space-6)',
    background: 'var(--bg-card)',
    borderRadius: '16px',
    border: '1px solid var(--border-subtle)',
  }}
>
  <h3
    style={{
      marginBottom: 'var(--space-4)',
      fontSize: '1.1rem',
      color: 'var(--text-main)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}
  >
    <Clock size={20} style={{ color: 'var(--color-royal-blue)' }} /> Ledige perioder for
    utleie
  </h3>
  {availability.length > 0 ? (
    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
      {availability.map((p) => {
        const canDelete =
          (canOwnerEditListingDetail && p.status !== 'Formidla') ||
          (isNavView && kommuneCanEdit && !ownerAgreementTerminated)
        return (
          <div
            key={p.id}
            className="listing-availability-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3)',
              background: 'var(--listing-availability-item-bg)',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Calendar
              size={16}
              style={{
                flexShrink: 0,
                color:
                  p.status === 'Formidla'
                    ? 'var(--color-royal-blue)'
                    : p.status === 'Utilgjengelig'
                      ? '#ef4444'
                      : 'var(--color-teal)',
              }}
            />
            <span
              className="listing-availability-dates"
              style={{ fontWeight: 600, color: 'var(--text-main)' }}
            >
              {formatDateNo(p.start_date)} - {formatDateNo(p.end_date)}
            </span>
            <span
              className="listing-availability-status"
              style={{
                fontSize: '0.75rem',
                color:
                  p.status === 'Formidla'
                    ? 'var(--color-royal-blue)'
                    : p.status === 'Utilgjengelig'
                      ? '#ef4444'
                      : 'var(--color-teal)',
                background:
                  p.status === 'Formidla'
                    ? 'rgba(59, 130, 246, 0.1)'
                    : p.status === 'Utilgjengelig'
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(32, 187, 175, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
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
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--text-muted)',
                  opacity: 0.7,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
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
    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
      Ingen spesifikke ledige perioder er lagt til for denne boligen.
    </p>
  )}
  {(isNavView || availability.length > 0) && (
    <div style={{ marginTop: 'var(--space-6)' }}>
      <h4
        style={{
          marginBottom: 'var(--space-3)',
          fontSize: '0.95rem',
          color: 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Calendar size={18} style={{ color: 'var(--color-royal-blue)' }} />{' '}
        {t('calendar')}
      </h4>
      <div
        className="listing-availability-cal-inner"
        style={{
          background: 'var(--listing-availability-item-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          padding: 'var(--space-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-3)',
          }}
        >
          <button
            type="button"
            onClick={() =>
              setCalendarMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
              )
            }
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              color: 'var(--text-body)',
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <span
            style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}
          >
            {calendarMonth.toLocaleDateString('no-NO', {
              month: 'long',
              year: 'numeric',
            })}
          </span>
          <button
            type="button"
            onClick={() =>
              setCalendarMonth(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
              )
            }
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              color: 'var(--text-body)',
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '2px',
            fontSize: '0.75rem',
          }}
        >
          {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map((day) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontWeight: 600,
                color: 'var(--text-muted)',
                padding: '4px 0',
              }}
            >
              {day}
            </div>
          ))}
          {(() => {
            const year = calendarMonth.getFullYear(),
              month = calendarMonth.getMonth(),
              first = new Date(year, month, 1),
              last = new Date(year, month + 1, 0),
              startPad = (first.getDay() + 6) % 7,
              daysInMonth = last.getDate()
            const cells: ReactNode[] = []
            for (let i = 0; i < startPad; i++)
              cells.push(<div key={`pad-${i}`} style={{ minHeight: '32px' }} />)
            for (let d = 1; d <= daysInMonth; d++) {
              const date = new Date(year, month, d),
                status = getStatusForDate(date)
              const isInFormidletRange =
                formidletStart &&
                formidletEnd &&
                (() => {
                  const t = date.toISOString().slice(0, 10)
                  return t >= formidletStart && t <= formidletEnd
                })()
              let bg = 'var(--listing-calendar-cell-bg)'
              if (isInFormidletRange) bg = 'var(--calendar-formidlet-range-bg)'
              else if (status === 'Konflikt') bg = '#991b1b'
              else if (status === 'Formidla') bg = 'var(--calendar-formidlet-bg)'
              else if (status === 'Tilgjengelig') bg = 'var(--calendar-tilgjengelig-bg)'
              else if (status === 'Utilgjengelig') bg = 'var(--calendar-utilgjengelig-bg)'
              cells.push(
                <div
                  key={d}
                  title={status ? `${d}. ${status}` : `${d}`}
                  style={{
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    background: bg,
                    color:
                      status === 'Konflikt'
                        ? '#fff'
                        : status || isInFormidletRange
                          ? 'var(--text-main)'
                          : 'var(--text-muted)',
                    fontWeight: 500,
                  }}
                >
                  {d}
                </div>
              )
            }
            return cells
          })()}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            marginTop: 'var(--space-3)',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            title={t('calendarLegendFormidletInfo')}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 4,
                background: 'var(--calendar-formidlet-bg)',
              }}
            />{' '}
            {t('formidlet')}
          </span>
          <span
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            title={t('calendarLegendAvailableInfo')}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 4,
                background: 'var(--calendar-tilgjengelig-bg)',
              }}
            />{' '}
            {t('available')}
          </span>
          <span
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            title={t('calendarLegendUnavailableInfo')}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 4,
                background: 'var(--calendar-utilgjengelig-bg)',
              }}
            />{' '}
            {t('unavailable')}
          </span>
          <span
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            title={t('calendarLegendConflictInfo')}
          >
            <span
              style={{ width: 10, height: 10, borderRadius: 4, background: '#991b1b' }}
            />{' '}
            Konflikt
          </span>
        </div>
      </div>
    </div>
  )}
  {isNavView ? (
    <ListingDetailsNavMediationPanels listing={listing} availability={availability} currentUser={currentUser} kommuneCanEdit={kommuneCanEdit} ownerAgreementTerminated={ownerAgreementTerminated} mediationReservation={mediationReservation} mediation={mediation} t={t} />
  ) : null}
</div>
    </>
  )
}
