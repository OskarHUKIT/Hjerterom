'use client'

import Link from 'next/link'
import { User, Phone, MessageSquare, ShieldCheck, RotateCcw } from 'lucide-react'
import { DateInput } from '@/app/components/DateInput'
import { dayAvailabilityToneForIso } from '@/app/lib/listingDayAvailabilityTone'
import { MAX_MEDIATION_NOTE_IN_NOTIFICATION } from '@/app/lib/formidletNotification'
import { hasDepositGuarantee } from '@/features/listings/lib/listingDetailsUtils'
import type { ListingDetailsNavViewProps } from './listingDetailsNavViewTypes'

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
                  {t('regDailyPrice')}
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
                    {t('regWeeklyPrice')}:
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                    {listing.price_weekly},-
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-sm opacity-70" style={{ color: 'var(--text-muted)' }}>
                    {t('regMonthlyShort')}:
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
                    {t('regMonthlyLong')}:
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                    {listing.price_monthly_long},-
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-sm opacity-70" style={{ color: 'var(--text-muted)' }}>
                    {t('placeholderDeposit')}:
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
