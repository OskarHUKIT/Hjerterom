'use client'

import Link from 'next/link'
import {
  Building, Ruler, Bed, Users, Tag, Wifi, Zap, Tv, Clipboard, MessageSquare, Phone, User,
} from 'lucide-react'
import { hasDepositGuarantee, DEPOSIT_GUARANTEE_VALUES } from '@/features/listings/lib/listingDetailsUtils'
import type { TranslationKey } from '@/lib/translations'

export type ListingDetailsPropertySectionProps = {
  listing: any
  setListing: (l: any) => void
  canOwnerEditListingDetail: boolean
  isOwner: boolean
  isNavView: boolean
  viewerIsKommuneStaff: boolean
  ownerAgreementTerminated: boolean
  handleUpdateField: (field: string, value: unknown) => Promise<void>
  handlePetPolicyChange: (v: string) => Promise<void>
  translateType: (type: string) => string
  isSaving: string | null
  t: (key: any) => string
}

export default function ListingDetailsPropertySection(props: ListingDetailsPropertySectionProps) {
  const { listing, setListing, canOwnerEditListingDetail, isOwner, isNavView, viewerIsKommuneStaff, ownerAgreementTerminated, handleUpdateField, handlePetPolicyChange, translateType, isSaving, t } = props
  return (
    <>
{/* 2. Boliginformasjon (type, størrelse, boliginfo, inkludert, beskrivelse) */}
<section className="card listing-detail-card" style={{ padding: 'var(--space-8)' }}>
  <div
    className="listing-metrics-row"
    style={{
      display: 'grid',
      gap: 'var(--space-4)',
      padding: 'var(--space-6) 0',
      borderTop: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)',
      marginBottom: 'var(--space-6)',
    }}
  >
    <div className="listing-metric-cell" style={{ textAlign: 'center' }}>
      <Building
        size={20}
        style={{ color: 'var(--color-royal-blue)', marginBottom: '4px' }}
      />
      {canOwnerEditListingDetail ? (
        <select
          value={listing.type}
          onChange={(e) => {
            setListing({ ...listing, type: e.target.value })
            handleUpdateField('type', e.target.value)
          }}
          className="listing-metric-select"
          style={{
            fontWeight: 700,
            color: 'var(--text-main)',
            border: 'none',
            background: 'none',
            textAlign: 'center',
            width: '100%',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          <option value="Short-term">Korttid</option>
          <option value="Long-term">Langtid</option>
          <option value="Apartment">Leilighet</option>
          <option value="House">Enebolig</option>
          <option value="Shared">Bofelleskap</option>
        </select>
      ) : (
        <div
          className="listing-metric-value"
          style={{ fontWeight: 700, color: 'var(--text-main)' }}
        >
          {translateType(listing.type ?? '')}
        </div>
      )}
      <div style={{ fontSize: '0.7rem', opacity: 0.6, color: 'var(--text-muted)' }}>
        TYPE
      </div>
    </div>
    <div className="listing-metric-cell" style={{ textAlign: 'center' }}>
      <Ruler
        size={20}
        style={{ color: 'var(--color-royal-blue)', marginBottom: '4px' }}
      />
      {canOwnerEditListingDetail ? (
        <div
          className="listing-metric-size-input"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
          }}
        >
          <input
            type="number"
            value={listing.size_sqm}
            onChange={(e) => setListing({ ...listing, size_sqm: e.target.value })}
            onBlur={(e) => handleUpdateField('size_sqm', e.target.value)}
            style={{
              fontWeight: 700,
              color: 'var(--text-main)',
              border: 'none',
              background: 'none',
              textAlign: 'right',
              width: '40px',
              padding: 0,
              outline: 'none',
            }}
          />
          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>m²</span>
        </div>
      ) : (
        <div
          className="listing-metric-value"
          style={{ fontWeight: 700, color: 'var(--text-main)' }}
        >
          {listing.size_sqm} m²
        </div>
      )}
      <div style={{ fontSize: '0.7rem', opacity: 0.6, color: 'var(--text-muted)' }}>
        STØRRELSE
      </div>
    </div>
    <div className="listing-metric-cell" style={{ textAlign: 'center' }}>
      <Bed size={20} style={{ color: 'var(--color-royal-blue)', marginBottom: '4px' }} />
      {canOwnerEditListingDetail ? (
        <input
          type="number"
          value={listing.bedrooms}
          onChange={(e) => setListing({ ...listing, bedrooms: e.target.value })}
          onBlur={(e) => handleUpdateField('bedrooms', e.target.value)}
          style={{
            fontWeight: 700,
            color: 'var(--text-main)',
            border: 'none',
            background: 'none',
            textAlign: 'center',
            width: '100%',
            padding: 0,
            outline: 'none',
          }}
        />
      ) : (
        <div
          className="listing-metric-value"
          style={{ fontWeight: 700, color: 'var(--text-main)' }}
        >
          {listing.bedrooms}
        </div>
      )}
      <div style={{ fontSize: '0.7rem', opacity: 0.6, color: 'var(--text-muted)' }}>
        SOVEROM
      </div>
    </div>
    <div className="listing-metric-cell" style={{ textAlign: 'center' }}>
      <Users
        size={20}
        style={{ color: 'var(--color-royal-blue)', marginBottom: '4px' }}
      />
      {canOwnerEditListingDetail ? (
        <input
          type="number"
          value={listing.max_occupants}
          onChange={(e) => setListing({ ...listing, max_occupants: e.target.value })}
          onBlur={(e) => handleUpdateField('max_occupants', e.target.value)}
          style={{
            fontWeight: 700,
            color: 'var(--text-main)',
            border: 'none',
            background: 'none',
            textAlign: 'center',
            width: '100%',
            padding: 0,
            outline: 'none',
          }}
        />
      ) : (
        <div
          className="listing-metric-value"
          style={{ fontWeight: 700, color: 'var(--text-main)' }}
        >
          {listing.max_occupants}
        </div>
      )}
      <div style={{ fontSize: '0.7rem', opacity: 0.6, color: 'var(--text-muted)' }}>
        MAKS PERS
      </div>
    </div>
  </div>
  <div
    style={{
      marginTop: 'var(--space-5)',
      paddingTop: 'var(--space-4)',
      borderTop: '1px solid var(--border-subtle)',
    }}
  >
    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
      {t('paymentMethodLabel')}
    </div>
    {canOwnerEditListingDetail ? (
      <select
        value={listing.payment_method === 'konto' ? 'konto' : 'faktura'}
        onChange={(e) => {
          const v = e.target.value === 'konto' ? 'konto' : 'faktura'
          setListing({ ...listing, payment_method: v })
          void handleUpdateField('payment_method', v)
        }}
        className="input"
        style={{ maxWidth: 360, fontSize: '0.9rem', padding: '8px 12px' }}
      >
        <option value="faktura">{t('paymentMethodFaktura')}</option>
        <option value="konto">{t('paymentMethodKonto')}</option>
      </select>
    ) : (
      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
        {listing.payment_method === 'konto'
          ? t('paymentMethodKonto')
          : t('paymentMethodFaktura')}
      </div>
    )}
  </div>
  <div className="listing-detail-two-col">
    <div>
      <h3
        style={{
          marginBottom: 'var(--space-4)',
          fontSize: '1.1rem',
          color: 'var(--text-main)',
        }}
      >
        Boliginformasjon
      </h3>
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        <div className="text-sm" style={{ color: 'var(--text-body)' }}>
          <strong>Etasje:</strong>{' '}
          {canOwnerEditListingDetail ? (
            <input
              value={listing.floor_number}
              onChange={(e) => setListing({ ...listing, floor_number: e.target.value })}
              onBlur={(e) => handleUpdateField('floor_number', e.target.value)}
              className="listing-inline-input"
              style={{
                border: 'none',
                background: 'var(--listing-field-bg)',
                borderRadius: '4px',
                padding: '2px 6px',
                width: '80px',
                outline: 'none',
                color: 'var(--text-main)',
              }}
            />
          ) : (
            listing.floor_number
          )}
        </div>
        <div className="text-sm" style={{ color: 'var(--text-body)' }}>
          <strong>Møblering:</strong>{' '}
          {canOwnerEditListingDetail ? (
            <select
              value={listing.furnishing}
              onChange={(e) => {
                setListing({ ...listing, furnishing: e.target.value })
                handleUpdateField('furnishing', e.target.value)
              }}
              className="listing-inline-input"
              style={{
                border: 'none',
                background: 'var(--listing-field-bg)',
                borderRadius: '4px',
                padding: '2px 6px',
                outline: 'none',
                color: 'var(--text-main)',
              }}
            >
              <option>Umøblert</option>
              <option>Kun hvitevarer</option>
              <option>Delvis møblert</option>
              <option>Fullt møblert</option>
              <option>
                Fullt møblert og boligen har alt nødvendig inventar for matlaging og
                overnatting.
              </option>
              <option>Møblert m/utstyr</option>
            </select>
          ) : (
            listing.furnishing
          )}
        </div>
        <div className="text-sm" style={{ color: 'var(--text-body)' }}>
          <strong>Mulighet for husdyr:</strong>{' '}
          {canOwnerEditListingDetail ? (
            <>
              <select
                value={listing.pet_policy || 'Ingen dyr tillatt'}
                onChange={(e) => {
                  void handlePetPolicyChange(e.target.value)
                }}
                className="listing-inline-input"
                style={{
                  border: 'none',
                  background: 'var(--listing-field-bg)',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  outline: 'none',
                  color: 'var(--text-main)',
                }}
              >
                <option value="Tillatt">Tillatt</option>
                <option value="Ingen dyr tillatt">Ingen dyr tillatt</option>
                <option value="Enkelte dyr er tillatt">Enkelte dyr er tillatt</option>
              </select>
              {(listing.pet_policy || '') === 'Enkelte dyr er tillatt' && (
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                    Utdyp svaret ditt:{' '}
                  </span>
                  <input
                    value={listing.pet_policy_detail || ''}
                    onChange={(e) =>
                      setListing({ ...listing, pet_policy_detail: e.target.value })
                    }
                    onBlur={(e) => handleUpdateField('pet_policy_detail', e.target.value)}
                    className="listing-inline-input"
                    style={{
                      border: 'none',
                      background: 'var(--listing-field-bg)',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      width: 'min(100%, 280px)',
                      outline: 'none',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              {listing.pet_policy || '—'}
              {(listing.pet_policy || '') === 'Enkelte dyr er tillatt' &&
              listing.pet_policy_detail ? (
                <span style={{ display: 'block', fontSize: '0.85rem', marginTop: 4 }}>
                  {listing.pet_policy_detail}
                </span>
              ) : null}
            </>
          )}
        </div>
        <div className="text-sm" style={{ color: 'var(--text-body)' }}>
          <strong>Parkering:</strong>{' '}
          {canOwnerEditListingDetail ? (
            <input
              value={listing.parking_info}
              onChange={(e) => setListing({ ...listing, parking_info: e.target.value })}
              onBlur={(e) => handleUpdateField('parking_info', e.target.value)}
              className="listing-inline-input"
              style={{
                border: 'none',
                background: 'var(--listing-field-bg)',
                borderRadius: '4px',
                padding: '2px 6px',
                width: '150px',
                outline: 'none',
                color: 'var(--text-main)',
              }}
            />
          ) : (
            listing.parking_info
          )}
        </div>
        <div className="text-sm" style={{ color: 'var(--text-body)' }}>
          <strong>Fysisk tilrettelegging:</strong>{' '}
          {canOwnerEditListingDetail ? (
            <div
              style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}
            >
              {[
                'Alt på ett plan',
                'Heis i bygget',
                'Terskelfritt',
                'Universell utforming',
                'Omsorgsboligstandard',
              ].map((acc) => {
                const isActive = listing.accessibility?.includes(acc)
                return (
                  <button
                    key={acc}
                    onClick={() => {
                      const newAcc = isActive
                        ? listing.accessibility?.filter((a: string) => a !== acc) ?? []
                        : [...(listing.accessibility || []), acc]
                      setListing({ ...listing, accessibility: newAcc })
                      handleUpdateField('accessibility', newAcc)
                    }}
                    className="listing-tag listing-tag-accessibility"
                    style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      background: isActive
                        ? 'var(--color-royal-blue)'
                        : 'var(--listing-tag-bg)',
                      border:
                        '1px solid ' +
                        (isActive ? 'var(--color-royal-blue)' : 'var(--border-subtle)'),
                      color: isActive ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    {acc}
                  </button>
                )
              })}
            </div>
          ) : (
            listing.accessibility?.join(', ') || 'Ingen'
          )}
        </div>
      </div>
    </div>
    <div>
      <h3
        style={{
          marginBottom: 'var(--space-4)',
          fontSize: '1.1rem',
          color: 'var(--text-main)',
        }}
      >
        Inkludert i leie
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {canOwnerEditListingDetail ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {[
              'Strøm',
              'Internett',
              'Kommunale avgifter',
              'Vaktmestertjenester',
              'Parkering',
            ].map((inc) => {
              const isActive = listing.includes?.includes(inc)
              return (
                <button
                  key={inc}
                  onClick={() => {
                    const newInc = isActive
                      ? listing.includes.filter((i: string) => i !== inc)
                      : [...(listing.includes || []), inc]
                    setListing({ ...listing, includes: newInc })
                    handleUpdateField('includes', newInc)
                  }}
                  className="listing-tag listing-tag-includes"
                  style={{
                    padding: '4px 12px',
                    borderRadius: '14px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: isActive
                      ? 'var(--listing-tag-includes-active-bg)'
                      : 'transparent',
                    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {inc}
                </button>
              )
            })}
          </div>
        ) : (
          <>
            {listing.includes?.map((i: string) => (
              <span
                key={i}
                className="listing-tag listing-tag-includes-static"
                style={{
                  padding: '4px 12px',
                  borderRadius: '14px',
                  background: 'var(--listing-tag-includes-active-bg)',
                  color: 'var(--text-main)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {i}
              </span>
            ))}
            {(!listing.includes || listing.includes.length === 0) && (
              <span
                className="text-sm"
                style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}
              >
                Ingenting inkludert
              </span>
            )}
          </>
        )}
      </div>
    </div>
  </div>
  <div style={{ marginTop: 'var(--space-8)' }}>
    <h3
      style={{
        marginBottom: 'var(--space-4)',
        fontSize: '1.1rem',
        color: 'var(--text-main)',
      }}
    >
      Beskrivelse
    </h3>
    {canOwnerEditListingDetail ? (
      <textarea
        value={listing.additional_info}
        onChange={(e) => setListing({ ...listing, additional_info: e.target.value })}
        onBlur={(e) => handleUpdateField('additional_info', e.target.value)}
        className="listing-textarea"
        style={{
          width: '100%',
          minHeight: '150px',
          fontSize: '1rem',
          lineHeight: '1.6',
          color: 'var(--text-body)',
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
          borderRadius: '8px',
          padding: 'var(--space-4)',
          outline: 'none',
        }}
      />
    ) : (
      <p
        style={{
          whiteSpace: 'pre-wrap',
          fontSize: '1rem',
          lineHeight: '1.6',
          color: 'var(--text-body)',
        }}
      >
        {listing.additional_info || 'Ingen ytterligere beskrivelse.'}
      </p>
    )}
  </div>
</section>

{/* 3. Prisnivåer */}
<section className="card listing-detail-card" style={{ padding: 'var(--space-6)' }}>
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
    <Tag size={20} style={{ color: 'var(--color-accent)' }} /> Prisnivåer
  </h3>
  {canOwnerEditListingDetail ? (
    <div
      style={{
        padding: 'var(--space-4)',
        background: 'var(--bg-app)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        color: 'var(--text-main)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        <div>
          <label
            className="label"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              marginBottom: '4px',
            }}
          >
            DØGNPRIS
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              value={listing.price_daily}
              onChange={(e) => setListing({ ...listing, price_daily: e.target.value })}
              onBlur={(e) => handleUpdateField('price_daily', e.target.value)}
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                background: 'none',
                border: 'none',
                color: 'var(--text-main)',
                width: '100px',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>,-</span>
          </div>
        </div>
        <div>
          <label
            className="label"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              marginBottom: '4px',
            }}
          >
            UKESPRIS
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              value={listing.price_weekly}
              onChange={(e) => setListing({ ...listing, price_weekly: e.target.value })}
              onBlur={(e) => handleUpdateField('price_weekly', e.target.value)}
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                background: 'none',
                border: 'none',
                color: 'var(--text-main)',
                width: '80px',
                outline: 'none',
              }}
            />
            <span>,-</span>
          </div>
        </div>
        <div>
          <label
            className="label"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              marginBottom: '4px',
            }}
          >
            MÅNEDSLEIE (KORTTID)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              value={listing.price_monthly_short}
              onChange={(e) =>
                setListing({ ...listing, price_monthly_short: e.target.value })
              }
              onBlur={(e) => handleUpdateField('price_monthly_short', e.target.value)}
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                background: 'none',
                border: 'none',
                color: 'var(--text-main)',
                width: '80px',
                outline: 'none',
              }}
            />
            <span>,-</span>
          </div>
        </div>
        <div>
          <label
            className="label"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              marginBottom: '4px',
            }}
          >
            LANGTIDSLEIE (PER MND)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              value={listing.price_monthly_long}
              onChange={(e) =>
                setListing({ ...listing, price_monthly_long: e.target.value })
              }
              onBlur={(e) => handleUpdateField('price_monthly_long', e.target.value)}
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                background: 'none',
                border: 'none',
                color: 'var(--text-main)',
                width: '80px',
                outline: 'none',
              }}
            />
            <span>,-</span>
          </div>
        </div>
        <div>
          <label
            className="label"
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              marginBottom: '4px',
            }}
          >
            DEPOSITUM
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              value={listing.deposit_amount}
              onChange={(e) => setListing({ ...listing, deposit_amount: e.target.value })}
              onBlur={(e) => handleUpdateField('deposit_amount', e.target.value)}
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                background: 'none',
                border: 'none',
                color: 'var(--text-main)',
                width: '80px',
                outline: 'none',
              }}
            />
            <span>,-</span>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 'var(--space-4)',
        color: 'var(--text-body)',
      }}
    >
      <div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Døgnpris</span>
        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
          {listing.price_daily != null ? `${listing.price_daily},-` : '–'}
        </div>
      </div>
      <div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ukespris</span>
        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
          {listing.price_weekly != null ? `${listing.price_weekly},-` : '–'}
        </div>
      </div>
      <div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Mnd (korttid)
        </span>
        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
          {listing.price_monthly_short != null ? `${listing.price_monthly_short},-` : '–'}
        </div>
      </div>
      <div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Mnd (langtid)
        </span>
        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
          {listing.price_monthly_long != null ? `${listing.price_monthly_long},-` : '–'}
        </div>
      </div>
      <div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Depositum</span>
        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
          {listing.deposit_amount != null ? `${listing.deposit_amount},-` : '–'}
        </div>
      </div>
    </div>
  )}
</section>
    </>
  )
}
