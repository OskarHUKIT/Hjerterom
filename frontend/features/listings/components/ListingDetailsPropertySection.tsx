'use client'

import {
  Building, Ruler, Bed, Users, Tag,
} from 'lucide-react'
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

const ACCESSIBILITY_OPTIONS = [
  'Alt på ett plan',
  'Heis i bygget',
  'Terskelfritt',
  'Universell utforming',
  'Omsorgsboligstandard',
] as const

const INCLUDE_OPTIONS = [
  'Strøm',
  'Internett',
  'Kommunale avgifter',
  'Vaktmestertjenester',
  'Parkering',
] as const

export default function ListingDetailsPropertySection(props: ListingDetailsPropertySectionProps) {
  const {
    listing,
    setListing,
    canOwnerEditListingDetail,
    handleUpdateField,
    handlePetPolicyChange,
    translateType,
    t,
  } = props

  return (
    <>
      <section className="card listing-detail-card listing-detail-card--lg">
        <div className="listing-metrics-row">
          <div className="listing-metric-cell">
            <Building size={20} className="listing-metric-icon" />
            {canOwnerEditListingDetail ? (
              <select
                value={listing.type}
                onChange={(e) => {
                  setListing({ ...listing, type: e.target.value })
                  handleUpdateField('type', e.target.value)
                }}
                className="listing-metric-select"
              >
                <option value="Short-term">Korttid</option>
                <option value="Long-term">Langtid</option>
                <option value="Apartment">Leilighet</option>
                <option value="House">Enebolig</option>
                <option value="Shared">Bofelleskap</option>
              </select>
            ) : (
              <div className="listing-metric-value">{translateType(listing.type ?? '')}</div>
            )}
            <div className="listing-metric-label">TYPE</div>
          </div>

          <div className="listing-metric-cell">
            <Ruler size={20} className="listing-metric-icon" />
            {canOwnerEditListingDetail ? (
              <div className="listing-metric-size-input">
                <input
                  type="number"
                  value={listing.size_sqm}
                  onChange={(e) => setListing({ ...listing, size_sqm: e.target.value })}
                  onBlur={(e) => handleUpdateField('size_sqm', e.target.value)}
                  className="listing-metric-input listing-metric-input--size"
                />
                <span className="listing-metric-unit">m²</span>
              </div>
            ) : (
              <div className="listing-metric-value">{listing.size_sqm} m²</div>
            )}
            <div className="listing-metric-label">STØRRELSE</div>
          </div>

          <div className="listing-metric-cell">
            <Bed size={20} className="listing-metric-icon" />
            {canOwnerEditListingDetail ? (
              <input
                type="number"
                value={listing.bedrooms}
                onChange={(e) => setListing({ ...listing, bedrooms: e.target.value })}
                onBlur={(e) => handleUpdateField('bedrooms', e.target.value)}
                className="listing-metric-input"
              />
            ) : (
              <div className="listing-metric-value">{listing.bedrooms}</div>
            )}
            <div className="listing-metric-label">SOVEROM</div>
          </div>

          <div className="listing-metric-cell">
            <Users size={20} className="listing-metric-icon" />
            {canOwnerEditListingDetail ? (
              <input
                type="number"
                value={listing.max_occupants}
                onChange={(e) => setListing({ ...listing, max_occupants: e.target.value })}
                onBlur={(e) => handleUpdateField('max_occupants', e.target.value)}
                className="listing-metric-input"
              />
            ) : (
              <div className="listing-metric-value">{listing.max_occupants}</div>
            )}
            <div className="listing-metric-label">MAKS PERS</div>
          </div>
        </div>

        <div className="listing-payment-block">
          <div className="listing-payment-label">{t('paymentMethodLabel')}</div>
          {canOwnerEditListingDetail ? (
            <select
              value={listing.payment_method === 'konto' ? 'konto' : 'faktura'}
              onChange={(e) => {
                const v = e.target.value === 'konto' ? 'konto' : 'faktura'
                setListing({ ...listing, payment_method: v })
                void handleUpdateField('payment_method', v)
              }}
              className="input listing-payment-select"
            >
              <option value="faktura">{t('paymentMethodFaktura')}</option>
              <option value="konto">{t('paymentMethodKonto')}</option>
            </select>
          ) : (
            <div className="listing-payment-value">
              {listing.payment_method === 'konto'
                ? t('paymentMethodKonto')
                : t('paymentMethodFaktura')}
            </div>
          )}
        </div>

        <div className="listing-detail-two-col">
          <div>
            <h3 className="listing-subsection-title">Boliginformasjon</h3>
            <div className="listing-field-grid">
              <div className="text-sm listing-field-row">
                <strong>Etasje:</strong>{' '}
                {canOwnerEditListingDetail ? (
                  <input
                    value={listing.floor_number}
                    onChange={(e) => setListing({ ...listing, floor_number: e.target.value })}
                    onBlur={(e) => handleUpdateField('floor_number', e.target.value)}
                    className="listing-inline-input listing-inline-input--floor"
                  />
                ) : (
                  listing.floor_number
                )}
              </div>

              <div className="text-sm listing-field-row">
                <strong>Møblering:</strong>{' '}
                {canOwnerEditListingDetail ? (
                  <select
                    value={listing.furnishing}
                    onChange={(e) => {
                      setListing({ ...listing, furnishing: e.target.value })
                      handleUpdateField('furnishing', e.target.value)
                    }}
                    className="listing-inline-input"
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

              <div className="text-sm listing-field-row">
                <strong>Mulighet for husdyr:</strong>{' '}
                {canOwnerEditListingDetail ? (
                  <>
                    <select
                      value={listing.pet_policy || 'Ingen dyr tillatt'}
                      onChange={(e) => {
                        void handlePetPolicyChange(e.target.value)
                      }}
                      className="listing-inline-input"
                    >
                      <option value="Tillatt">Tillatt</option>
                      <option value="Ingen dyr tillatt">Ingen dyr tillatt</option>
                      <option value="Enkelte dyr er tillatt">Enkelte dyr er tillatt</option>
                    </select>
                    {(listing.pet_policy || '') === 'Enkelte dyr er tillatt' && (
                      <div className="listing-pet-detail">
                        <span className="listing-pet-detail-hint">Utdyp svaret ditt: </span>
                        <input
                          value={listing.pet_policy_detail || ''}
                          onChange={(e) =>
                            setListing({ ...listing, pet_policy_detail: e.target.value })
                          }
                          onBlur={(e) => handleUpdateField('pet_policy_detail', e.target.value)}
                          className="listing-inline-input listing-inline-input--detail"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {listing.pet_policy || '—'}
                    {(listing.pet_policy || '') === 'Enkelte dyr er tillatt' &&
                    listing.pet_policy_detail ? (
                      <span className="listing-pet-detail-read">{listing.pet_policy_detail}</span>
                    ) : null}
                  </>
                )}
              </div>

              <div className="text-sm listing-field-row">
                <strong>Parkering:</strong>{' '}
                {canOwnerEditListingDetail ? (
                  <input
                    value={listing.parking_info}
                    onChange={(e) => setListing({ ...listing, parking_info: e.target.value })}
                    onBlur={(e) => handleUpdateField('parking_info', e.target.value)}
                    className="listing-inline-input listing-inline-input--parking"
                  />
                ) : (
                  listing.parking_info
                )}
              </div>

              <div className="text-sm listing-field-row">
                <strong>Fysisk tilrettelegging:</strong>{' '}
                {canOwnerEditListingDetail ? (
                  <div className="listing-tag-row">
                    {ACCESSIBILITY_OPTIONS.map((acc) => {
                      const isActive = listing.accessibility?.includes(acc)
                      return (
                        <button
                          key={acc}
                          type="button"
                          onClick={() => {
                            const newAcc = isActive
                              ? listing.accessibility?.filter((a: string) => a !== acc) ?? []
                              : [...(listing.accessibility || []), acc]
                            setListing({ ...listing, accessibility: newAcc })
                            handleUpdateField('accessibility', newAcc)
                          }}
                          className={`listing-tag listing-tag-accessibility${
                            isActive ? ' listing-tag-accessibility--active' : ''
                          }`}
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
            <h3 className="listing-subsection-title">Inkludert i leie</h3>
            <div className="listing-includes-wrap">
              {canOwnerEditListingDetail ? (
                <div className="listing-includes-edit-row">
                  {INCLUDE_OPTIONS.map((inc) => {
                    const isActive = listing.includes?.includes(inc)
                    return (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => {
                          const newInc = isActive
                            ? listing.includes.filter((i: string) => i !== inc)
                            : [...(listing.includes || []), inc]
                          setListing({ ...listing, includes: newInc })
                          handleUpdateField('includes', newInc)
                        }}
                        className={`listing-tag listing-tag-includes${
                          isActive ? ' listing-tag-includes--active' : ''
                        }`}
                      >
                        {inc}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <>
                  {listing.includes?.map((i: string) => (
                    <span key={i} className="listing-tag listing-tag-includes-static">
                      {i}
                    </span>
                  ))}
                  {(!listing.includes || listing.includes.length === 0) && (
                    <span className="text-sm listing-includes-empty">Ingenting inkludert</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="listing-description-block">
          <h3 className="listing-subsection-title">Beskrivelse</h3>
          {canOwnerEditListingDetail ? (
            <textarea
              value={listing.additional_info}
              onChange={(e) => setListing({ ...listing, additional_info: e.target.value })}
              onBlur={(e) => handleUpdateField('additional_info', e.target.value)}
              className="listing-textarea"
            />
          ) : (
            <p className="listing-description-text">
              {listing.additional_info || 'Ingen ytterligere beskrivelse.'}
            </p>
          )}
        </div>
      </section>

      <section className="card listing-detail-card">
        <h3 className="listing-subsection-title listing-subsection-title--icon">
          <Tag size={20} /> Prisnivåer
        </h3>
        {canOwnerEditListingDetail ? (
          <div className="listing-price-panel">
            <div className="listing-price-grid">
              <div>
                <label className="label listing-price-label">DØGNPRIS</label>
                <div className="listing-price-input-row">
                  <input
                    type="number"
                    value={listing.price_daily}
                    onChange={(e) => setListing({ ...listing, price_daily: e.target.value })}
                    onBlur={(e) => handleUpdateField('price_daily', e.target.value)}
                    className="listing-price-input listing-price-input--hero"
                  />
                  <span className="listing-price-suffix">,-</span>
                </div>
              </div>
              <div>
                <label className="label listing-price-label">UKESPRIS</label>
                <div className="listing-price-input-row">
                  <input
                    type="number"
                    value={listing.price_weekly}
                    onChange={(e) => setListing({ ...listing, price_weekly: e.target.value })}
                    onBlur={(e) => handleUpdateField('price_weekly', e.target.value)}
                    className="listing-price-input listing-price-input--std"
                  />
                  <span className="listing-price-suffix listing-price-suffix--std">,-</span>
                </div>
              </div>
              <div>
                <label className="label listing-price-label">MÅNEDSLEIE (KORTTID)</label>
                <div className="listing-price-input-row">
                  <input
                    type="number"
                    value={listing.price_monthly_short}
                    onChange={(e) =>
                      setListing({ ...listing, price_monthly_short: e.target.value })
                    }
                    onBlur={(e) => handleUpdateField('price_monthly_short', e.target.value)}
                    className="listing-price-input listing-price-input--std"
                  />
                  <span className="listing-price-suffix listing-price-suffix--std">,-</span>
                </div>
              </div>
              <div>
                <label className="label listing-price-label">LANGTIDSLEIE (PER MND)</label>
                <div className="listing-price-input-row">
                  <input
                    type="number"
                    value={listing.price_monthly_long}
                    onChange={(e) =>
                      setListing({ ...listing, price_monthly_long: e.target.value })
                    }
                    onBlur={(e) => handleUpdateField('price_monthly_long', e.target.value)}
                    className="listing-price-input listing-price-input--std"
                  />
                  <span className="listing-price-suffix listing-price-suffix--std">,-</span>
                </div>
              </div>
              <div>
                <label className="label listing-price-label">DEPOSITUM</label>
                <div className="listing-price-input-row">
                  <input
                    type="number"
                    value={listing.deposit_amount}
                    onChange={(e) => setListing({ ...listing, deposit_amount: e.target.value })}
                    onBlur={(e) => handleUpdateField('deposit_amount', e.target.value)}
                    className="listing-price-input listing-price-input--std"
                  />
                  <span className="listing-price-suffix listing-price-suffix--std">,-</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="listing-price-grid listing-price-grid--read">
            <div>
              <span className="listing-price-read-label">Døgnpris</span>
              <div className="listing-price-read-value">
                {listing.price_daily != null ? `${listing.price_daily},-` : '–'}
              </div>
            </div>
            <div>
              <span className="listing-price-read-label">Ukespris</span>
              <div className="listing-price-read-value">
                {listing.price_weekly != null ? `${listing.price_weekly},-` : '–'}
              </div>
            </div>
            <div>
              <span className="listing-price-read-label">Mnd (korttid)</span>
              <div className="listing-price-read-value">
                {listing.price_monthly_short != null ? `${listing.price_monthly_short},-` : '–'}
              </div>
            </div>
            <div>
              <span className="listing-price-read-label">Mnd (langtid)</span>
              <div className="listing-price-read-value">
                {listing.price_monthly_long != null ? `${listing.price_monthly_long},-` : '–'}
              </div>
            </div>
            <div>
              <span className="listing-price-read-label">Depositum</span>
              <div className="listing-price-read-value">
                {listing.deposit_amount != null ? `${listing.deposit_amount},-` : '–'}
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
