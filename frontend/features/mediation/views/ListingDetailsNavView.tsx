'use client'

import Link from 'next/link'
import {
  User,
  Phone,
  MessageSquare,
  Send,
  Lock,
  Clock,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react'
import { DateInput } from '@/app/components/DateInput'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import { dayAvailabilityToneForIso } from '@/app/lib/listingDayAvailabilityTone'
import { MAX_MEDIATION_NOTE_IN_NOTIFICATION } from '@/app/lib/formidletNotification'
import { hasDepositGuarantee } from '@/features/listings/lib/listingDetailsUtils'
import type { ListingAvailabilityRow, ListingDetailsRecord, MediationReservationRow, NavNoteRow } from '@/app/lib/listingUiTypes'
import type { User as AuthUser } from '@supabase/supabase-js'
import type { TranslationKey } from '@/lib/translations'
import type { useListingMediation } from '@/features/mediation/hooks/useListingMediation'

type MediationState = ReturnType<typeof useListingMediation>

export type ListingDetailsNavViewProps = {
  listing: ListingDetailsRecord
  availability: ListingAvailabilityRow[]
  currentUser: AuthUser | null
  kommuneCanEdit: boolean
  ownerAgreementTerminated: boolean
  mediationReservation: MediationReservationRow | null
  navNotes: NavNoteRow[]
  showNavNotes: boolean
  setShowNavNotes: React.Dispatch<React.SetStateAction<boolean>>
  newNote: string
  setNewNote: React.Dispatch<React.SetStateAction<string>>
  onAddNote: (e: React.FormEvent) => void
  mediation: MediationState
  t: (key: TranslationKey) => string
}

export function ListingDetailsNavNotesPanel({
  navNotes,
  newNote,
  setNewNote,
  onAddNote,
  t,
}: Pick<ListingDetailsNavViewProps, 'navNotes' | 'newNote' | 'setNewNote' | 'onAddNote' | 't'>) {
  return (
            <section
              className="card"
              style={{
                padding: 'var(--space-6)',
                border: '1px solid var(--color-sky-blue)',
                background: 'rgba(59, 130, 246, 0.03)',
              }}
            >
              <h3
                style={{
                  marginBottom: 'var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--text-main)',
                }}
              >
                <MessageSquare size={20} style={{ color: 'var(--color-accent)' }} />{' '}
                {t('noteForCaseworker')}
              </h3>
              <form onSubmit={onAddNote} style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ position: 'relative' }}>
                  <textarea
                    className="input"
                    placeholder={t('addInternalNotePlaceholder')}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    style={{
                      minHeight: '100px',
                      paddingRight: 'var(--space-10)',
                      color: 'var(--text-main)',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      position: 'absolute',
                      bottom: '15px',
                      right: '15px',
                      background: 'var(--color-accent)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-on-dark)',
                      cursor: 'pointer',
                    }}
                  >
                    <Send size={18} />
                  </button>
                </div>
                <p
                  className="text-sm"
                  style={{ marginTop: 'var(--space-2)', color: 'var(--text-muted)' }}
                >
                  {t('onlyVisibleCaseworker')}
                </p>
              </form>
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {navNotes.length > 0 ? (
                  navNotes.map((note) => (
                    <div
                      key={note.id}
                      style={{
                        padding: 'var(--space-4)',
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        borderLeft: '4px solid var(--color-accent)',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-body)' }}>
                        {note.note_text}
                      </p>
                      <div
                        style={{
                          marginTop: 'var(--space-2)',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {formatDateTimeNo(note.created_at)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p
                    className="text-sm"
                    style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}
                  >
                    {t('noNotesYet')}
                  </p>
                )}
              </div>
            </section>
  )
}

export function ListingDetailsNavMediationPanels({
  listing,
  availability,
  currentUser,
  kommuneCanEdit,
  ownerAgreementTerminated,
  mediationReservation,
  mediation,
  t,
}: Pick<
  ListingDetailsNavViewProps,
  | 'listing'
  | 'availability'
  | 'currentUser'
  | 'kommuneCanEdit'
  | 'ownerAgreementTerminated'
  | 'mediationReservation'
  | 'mediation'
  | 't'
>) {
  const isNavView = true
  const {
    formidletStart,
    setFormidletStart,
    formidletEnd,
    setFormidletEnd,
    formidletSending,
    formidletMediationNote,
    setFormidletMediationNote,
    formidletIncludeNoteInNotification,
    setFormidletIncludeNoteInNotification,
    reservationNote,
    setReservationNote,
    reservationLoading,
    handleReserveMediation,
    handleReleaseMediation,
    handleAddFormidletPeriod,
    handleRemoveFormidlet,
  } = mediation

  return (
    <>
{isNavView && kommuneCanEdit && !ownerAgreementTerminated && (
              <div
                style={{
                  marginTop: 'var(--space-6)',
                  padding: 'var(--space-4)',
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                }}
              >
                <h4
                  style={{
                    marginBottom: 'var(--space-2)',
                    fontSize: '0.95rem',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Lock size={18} style={{ opacity: 0.9 }} /> {t('mediationReserveTitle')}
                </h4>
                <p
                  className="text-sm"
                  style={{
                    margin: '0 0 var(--space-3)',
                    color: 'var(--text-body)',
                    lineHeight: 1.5,
                  }}
                >
                  {t('mediationReserveHint')}
                </p>
                {mediationReservation ? (
                  mediationReservation.reserved_by === currentUser?.id ? (
                    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                      <p className="text-sm" style={{ margin: 0, color: 'var(--text-main)' }}>
                        {t('mediationReservedByYou').replace(
                          '{expires}',
                          mediationReservation.expires_at
                            ? formatDateTimeNo(mediationReservation.expires_at)
                            : '—'
                        )}
                      </p>
                      {mediationReservation.internal_note ? (
                        <p className="text-sm" style={{ margin: 0, opacity: 0.85 }}>
                          <strong>{t('mediationInternalNote')}:</strong>{' '}
                          {mediationReservation.internal_note}
                        </p>
                      ) : null}
                      <label className="label" style={{ fontSize: '0.7rem' }}>
                        {t('mediationInternalNote')}
                      </label>
                      <textarea
                        className="input"
                        rows={2}
                        value={reservationNote}
                        onChange={(e) => setReservationNote(e.target.value)}
                        placeholder={t('mediationInternalNote')}
                        style={{ marginBottom: 0, resize: 'vertical', minHeight: '56px' }}
                      />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        <button
                          type="button"
                          onClick={handleReserveMediation}
                          disabled={reservationLoading}
                          className="button"
                          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        >
                          <Clock size={14} /> {t('mediationReserveButton')}
                        </button>
                        <button
                          type="button"
                          onClick={handleReleaseMediation}
                          disabled={reservationLoading}
                          className="button"
                          style={{
                            padding: '8px 16px',
                            fontSize: '0.85rem',
                            background: 'var(--bg-subtle)',
                          }}
                        >
                          {t('mediationRelease')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ margin: 0, color: 'var(--text-body)' }}>
                      {t('mediationReservedByOther')
                        .replace('{name}', mediationReservation.reserved_by_name || '…')
                        .replace(
                          '{expires}',
                          mediationReservation.expires_at
                            ? formatDateTimeNo(mediationReservation.expires_at)
                            : '—'
                        )}
                    </p>
                  )
                ) : (
                  <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    <label className="label" style={{ fontSize: '0.7rem' }}>
                      {t('mediationInternalNote')}
                    </label>
                    <textarea
                      className="input"
                      rows={2}
                      value={reservationNote}
                      onChange={(e) => setReservationNote(e.target.value)}
                      placeholder={t('mediationInternalNote')}
                      style={{ marginBottom: 0, resize: 'vertical', minHeight: '56px' }}
                    />
                    <div>
                      <button
                        type="button"
                        onClick={handleReserveMediation}
                        disabled={reservationLoading}
                        className="button"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        <Lock size={14} /> {t('mediationReserveButton')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {isNavView && !ownerAgreementTerminated && (
              <div
                style={{
                  marginTop: 'var(--space-6)',
                  padding: 'var(--space-4)',
                  background: 'rgba(59, 130, 246, 0.08)',
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                }}
              >
                <h4
                  style={{
                    marginBottom: 'var(--space-3)',
                    fontSize: '0.95rem',
                    color: 'var(--text-main)',
                  }}
                >
                  {t('formidling')}
                </h4>
                {!kommuneCanEdit ? (
                  <p className="text-sm" style={{ color: 'var(--text-body)' }}>
                    {t('formidlingManagedByCaseworker')}
                  </p>
                ) : listing?.status === 'Formidla' ? (
                  <div>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--text-body)', marginBottom: 'var(--space-3)' }}
                    >
                      {t('thisPropertyMarkedFormidlet')}
                    </p>
                    <button
                      onClick={handleRemoveFormidlet}
                      className="button"
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        background: 'rgba(239, 68, 68, 0.9)',
                      }}
                    >
                      <RotateCcw size={14} /> {t('removeFormidling')}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    <label
                      className="label"
                      style={{ fontSize: '0.7rem', color: 'var(--color-accent)' }}
                    >
                      {t('periodDateRange')}
                    </label>
                    <div className="listing-mediation-dates-row">
                      <div className="listing-mediation-date-field">
                        <span
                          className="text-sm"
                          style={{
                            display: 'block',
                            marginBottom: '4px',
                            color: 'var(--text-body)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {t('from')}
                        </span>
                        <DateInput
                          showCalendar
                          className="input"
                          style={{
                            marginBottom: 0,
                            fontSize: '0.9rem',
                            background: 'var(--listing-field-bg)',
                            color: 'var(--text-main)',
                            borderColor: 'rgba(59, 130, 246, 0.5)',
                            opacity:
                              mediationReservation &&
                              mediationReservation.reserved_by !== currentUser?.id
                                ? 0.55
                                : 1,
                          }}
                          value={formidletStart}
                          onChange={setFormidletStart}
                          max={formidletEnd || undefined}
                          placeholder={t('dateInputPlaceholder')}
                          calendarDayTone={(iso) =>
                            dayAvailabilityToneForIso(iso, availability)
                          }
                          disabled={
                            !!(
                              mediationReservation &&
                              mediationReservation.reserved_by !== currentUser?.id
                            )
                          }
                        />
                      </div>
                      <div className="listing-mediation-date-field">
                        <span
                          className="text-sm"
                          style={{
                            display: 'block',
                            marginBottom: '4px',
                            color: 'var(--text-body)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {t('to')}
                        </span>
                        <DateInput
                          showCalendar
                          className="input"
                          style={{
                            marginBottom: 0,
                            fontSize: '0.9rem',
                            background: 'var(--listing-field-bg)',
                            color: 'var(--text-main)',
                            borderColor: 'rgba(59, 130, 246, 0.5)',
                            opacity:
                              mediationReservation &&
                              mediationReservation.reserved_by !== currentUser?.id
                                ? 0.55
                                : 1,
                          }}
                          value={formidletEnd}
                          onChange={setFormidletEnd}
                          min={formidletStart || undefined}
                          placeholder={t('dateInputPlaceholder')}
                          calendarDayTone={(iso) =>
                            dayAvailabilityToneForIso(iso, availability)
                          }
                          disabled={
                            !!(
                              mediationReservation &&
                              mediationReservation.reserved_by !== currentUser?.id
                            )
                          }
                        />
                      </div>
                      <button
                        onClick={handleAddFormidletPeriod}
                        disabled={
                          formidletSending ||
                          !!(
                            mediationReservation &&
                            mediationReservation.reserved_by !== currentUser?.id
                          )
                        }
                        className="button listing-mediation-submit"
                        style={{ padding: '8px 16px', fontSize: '0.85rem', flexShrink: 0 }}
                      >
                        <ShieldCheck size={14} /> {t('addSubmit')}
                      </button>
                    </div>
                    <details style={{ fontSize: '0.8rem', marginTop: 'var(--space-1)' }}>
                      <summary
                        style={{
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          userSelect: 'none',
                        }}
                      >
                        {t('mediationNoteOptional')}
                      </summary>
                      <div
                        style={{
                          marginTop: 'var(--space-2)',
                          display: 'grid',
                          gap: 'var(--space-2)',
                          paddingTop: 'var(--space-2)',
                        }}
                      >
                        <textarea
                          className="input"
                          rows={2}
                          maxLength={MAX_MEDIATION_NOTE_IN_NOTIFICATION}
                          value={formidletMediationNote}
                          onChange={(e) => {
                            const v = e.target.value
                            setFormidletMediationNote(v)
                            if (!v.trim()) setFormidletIncludeNoteInNotification(false)
                          }}
                          placeholder={t('mediationNotePlaceholder')}
                          disabled={
                            !!(
                              mediationReservation &&
                              mediationReservation.reserved_by !== currentUser?.id
                            )
                          }
                          style={{
                            marginBottom: 0,
                            fontSize: '0.85rem',
                            resize: 'vertical',
                            minHeight: '48px',
                            maxHeight: '120px',
                          }}
                        />
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 'var(--space-2)',
                            cursor: 'pointer',
                            color: 'var(--text-body)',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formidletIncludeNoteInNotification}
                            onChange={(e) =>
                              setFormidletIncludeNoteInNotification(e.target.checked)
                            }
                            disabled={
                              !!(
                                mediationReservation &&
                                mediationReservation.reserved_by !== currentUser?.id
                              )
                            }
                            style={{ marginTop: '2px', width: '18px', height: '18px' }}
                          />
                          <span>{t('includeMediationNoteInNotification')}</span>
                        </label>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
    </>
  )
}

export function ListingDetailsNavStickySidebar({
  listing,
  availability,
  kommuneCanEdit,
  ownerAgreementTerminated,
  mediation,
  t,
}: Pick<
  ListingDetailsNavViewProps,
  'listing' | 'availability' | 'kommuneCanEdit' | 'ownerAgreementTerminated' | 'mediation' | 't'
>) {
  const {
    formidletStart,
    setFormidletStart,
    formidletEnd,
    setFormidletEnd,
    formidletSending,
    formidletMediationNote,
    setFormidletMediationNote,
    formidletIncludeNoteInNotification,
    setFormidletIncludeNoteInNotification,
    handleAddFormidletPeriod,
  } = mediation

  return (
          <div className="listing-details-sticky-sidebar" style={{ position: 'sticky', top: '20px' }}>
            <div
              className="card listing-nav-price-card"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
              }}
            >
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <div
                  style={{
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    opacity: 0.6,
                    marginBottom: '4px',
                    color: 'var(--text-muted)',
                  }}
                >
                  Døgnpris
                </div>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {listing.price_daily},-
                </span>
              </div>

              <div
                style={{ display: 'grid', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-sm opacity-70" style={{ color: 'var(--text-muted)' }}>
                    Ukespris:
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                    {listing.price_weekly},-
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-sm opacity-70" style={{ color: 'var(--text-muted)' }}>
                    Månedsleie (korttid):
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                    {listing.price_monthly_short},-
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: 'var(--space-3)',
                  }}
                >
                  <span className="text-sm opacity-70" style={{ color: 'var(--text-muted)' }}>
                    Langtidsleie (per mnd):
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                    {listing.price_monthly_long},-
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-sm opacity-70" style={{ color: 'var(--text-muted)' }}>
                    Depositum:
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                    {listing.deposit_amount},-
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginBottom: 'var(--space-4)',
                  padding: 'var(--space-3)',
                  background: 'var(--bg-app)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    opacity: 0.65,
                    marginBottom: 'var(--space-2)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {t('depositGuaranteeHeading')}
                </div>
                {listing.deposit_guarantee == null ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.45,
                    }}
                  >
                    {t('depositGuaranteeNotSpecified')}
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {[
                      ['nav', 'depositGuaranteeRowNav'] as const,
                      ['other', 'depositGuaranteeRowOther'] as const,
                      ['ordinary', 'depositGuaranteeRowOrdinary'] as const,
                    ].map(([key, labelKey]) => (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 'var(--space-3)',
                          fontSize: '0.85rem',
                          color: 'var(--text-main)',
                        }}
                      >
                        <span style={{ flex: 1, lineHeight: 1.4 }}>{t(labelKey)}</span>
                        <span style={{ fontWeight: 700, flexShrink: 0, opacity: 0.95 }}>
                          {hasDepositGuarantee(listing.deposit_guarantee, key)
                            ? t('depositGuaranteeYes')
                            : t('depositGuaranteeNo')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {ownerAgreementTerminated ? (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    background: 'var(--bg-app)',
                    borderRadius: '8px',
                    marginBottom: 'var(--space-4)',
                    fontSize: '0.9rem',
                    color: 'var(--text-body)',
                  }}
                >
                  {t('expiredOwnerNoMediationShort')}
                </div>
              ) : !kommuneCanEdit ? (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    background: 'var(--bg-app)',
                    borderRadius: '8px',
                    marginBottom: 'var(--space-4)',
                    fontSize: '0.9rem',
                    color: 'var(--text-body)',
                  }}
                >
                  {t('formidlingManagedByCaseworkerShort')}
                </div>
              ) : listing?.status === 'Formidla' ? (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    background: 'rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    marginBottom: 'var(--space-4)',
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
                  }}
                >
                  {t('formidletUseRemoveBelow')}
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <label
                      className="label"
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginBottom: 'var(--space-2)',
                        display: 'block',
                      }}
                    >
                      {t('tidsspannFormidling')}
                    </label>
                    <div className="listing-sidebar-formidlet-dates">
                      <div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '4px',
                          }}
                        >
                          {t('from')}
                        </span>
                        <DateInput
                          showCalendar
                          className="input"
                          value={formidletStart}
                          onChange={setFormidletStart}
                          max={formidletEnd || undefined}
                          placeholder={t('dateInputPlaceholder')}
                          calendarDayTone={(iso) =>
                            dayAvailabilityToneForIso(iso, availability)
                          }
                          style={{
                            padding: 'var(--space-2)',
                            fontSize: '0.85rem',
                            background: 'var(--bg-app)',
                            border: '1px solid var(--border-medium)',
                            color: 'var(--text-main)',
                            borderRadius: '8px',
                            marginBottom: 0,
                            width: '100%',
                          }}
                        />
                      </div>
                      <div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '4px',
                          }}
                        >
                          {t('to')}
                        </span>
                        <DateInput
                          showCalendar
                          className="input"
                          value={formidletEnd}
                          onChange={setFormidletEnd}
                          min={formidletStart || undefined}
                          placeholder={t('dateInputPlaceholder')}
                          calendarDayTone={(iso) =>
                            dayAvailabilityToneForIso(iso, availability)
                          }
                          style={{
                            padding: 'var(--space-2)',
                            fontSize: '0.85rem',
                            background: 'var(--bg-app)',
                            border: '1px solid var(--border-medium)',
                            color: 'var(--text-main)',
                            borderRadius: '8px',
                            marginBottom: 0,
                            width: '100%',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <details
                    style={{
                      fontSize: '0.75rem',
                      marginBottom: 'var(--space-3)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
                      {t('mediationNoteOptional')}
                    </summary>
                    <div
                      style={{
                        marginTop: 'var(--space-2)',
                        display: 'grid',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <textarea
                        className="input"
                        rows={2}
                        maxLength={MAX_MEDIATION_NOTE_IN_NOTIFICATION}
                        value={formidletMediationNote}
                        onChange={(e) => {
                          const v = e.target.value
                          setFormidletMediationNote(v)
                          if (!v.trim()) setFormidletIncludeNoteInNotification(false)
                        }}
                        placeholder={t('mediationNotePlaceholder')}
                        style={{
                          marginBottom: 0,
                          fontSize: '0.85rem',
                          resize: 'vertical',
                          minHeight: '48px',
                          maxHeight: '120px',
                          background: 'var(--bg-app)',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-main)',
                        }}
                      />
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 'var(--space-2)',
                          cursor: 'pointer',
                          color: 'var(--text-body)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formidletIncludeNoteInNotification}
                          onChange={(e) => setFormidletIncludeNoteInNotification(e.target.checked)}
                          style={{ marginTop: '2px', width: '18px', height: '18px' }}
                        />
                        <span>{t('includeMediationNoteInNotification')}</span>
                      </label>
                    </div>
                  </details>
                  <button
                    type="button"
                    onClick={handleAddFormidletPeriod}
                    disabled={formidletSending || !formidletStart || !formidletEnd}
                    className="button"
                    style={{
                      width: '100%',
                      padding: 'var(--space-4)',
                      fontSize: '1.1rem',
                      marginBottom: 'var(--space-4)',
                      opacity: formidletSending || !formidletStart || !formidletEnd ? 0.6 : 1,
                      cursor:
                        formidletSending || !formidletStart || !formidletEnd
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    {formidletSending ? t('startingFormidling') : t('startFormidling')}
                  </button>
                </>
              )}
              <div
                style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.6, color: 'var(--text-muted)' }}
              >
                {t('agreementHistoryLogged')}
              </div>
            </div>

            <div
              className="card"
              style={{
                marginTop: 'var(--space-6)',
                padding: 'var(--space-6)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h3
                style={{
                  fontSize: '1rem',
                  marginBottom: 'var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  color: 'var(--text-main)',
                }}
              >
                <User size={18} style={{ color: 'var(--text-main)' }} /> {t('landlord')}
              </h3>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {listing.owner_name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    fontSize: '0.9rem',
                    color: 'var(--text-body)',
                  }}
                >
                  <Phone size={14} style={{ color: 'var(--color-accent)' }} />{' '}
                  {listing.contact_phone}
                </div>
                {listing.owner_id && !ownerAgreementTerminated && (
                  <Link
                    href={`/nav/messages?with=${listing.owner_id}`}
                    className="button button-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-2)',
                      padding: 'var(--space-2) var(--space-4)',
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    <MessageSquare size={18} /> {t('message')}
                  </Link>
                )}
              </div>
            </div>
          </div>
  )
}

export default function ListingDetailsNavView(props: ListingDetailsNavViewProps) {
  return props.showNavNotes ? <ListingDetailsNavNotesPanel {...props} /> : null
}
