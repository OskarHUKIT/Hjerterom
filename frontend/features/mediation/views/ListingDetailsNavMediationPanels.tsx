'use client'

import { Lock, Clock, RotateCcw, ShieldCheck } from 'lucide-react'
import { DateInput } from '@/app/components/DateInput'
import { formatDateTimeNo } from '@/app/lib/dateFormat'
import { dayAvailabilityToneForIso } from '@/app/lib/listingDayAvailabilityTone'
import { MAX_MEDIATION_NOTE_IN_NOTIFICATION } from '@/app/lib/formidletNotification'
import type { ListingDetailsNavViewProps } from './listingDetailsNavViewTypes'

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
