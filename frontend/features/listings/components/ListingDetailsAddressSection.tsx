'use client'

import type { Dispatch, SetStateAction } from 'react'
import Link from 'next/link'
import { MessageSquare, MapPin, Bed, Users, ShieldCheck, Home as HomeIcon } from 'lucide-react'
import { getListingMapCoords } from '@/app/lib/listingMapCoords'

export type ListingDetailsAddressSectionProps = {
  listing: any
  setListing: (l: any) => void
  isNavView: boolean
  isOwner: boolean
  showNavNotes: boolean
  setShowNavNotes: Dispatch<SetStateAction<boolean>>
  navNotes: any[]
  canOwnerEditListingDetail: boolean
  showGalleryFormidlet: boolean
  handleUpdateField: (field: string, value: unknown) => Promise<void>
  t: (key: any) => string
}

export default function ListingDetailsAddressSection(props: ListingDetailsAddressSectionProps) {
  const { listing, setListing, isNavView, isOwner, showNavNotes, setShowNavNotes, navNotes, canOwnerEditListingDetail, showGalleryFormidlet, handleUpdateField, t } = props
  return (
    <>
{/* 1. Adresse øverst */}
<section
  className="card listing-detail-card"
  style={{ padding: 'var(--space-6)', position: 'relative' }}
>
  {isNavView && (
    <button
      type="button"
      onClick={() => setShowNavNotes((prev) => !prev)}
      title={showNavNotes ? t('hideNoteCaseworker') : t('showNoteCaseworker')}
      style={{
        position: 'absolute',
        top: 'var(--space-4)',
        right: 'var(--space-4)',
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        border: '1px solid var(--border-subtle)',
        background: showNavNotes ? 'var(--color-accent)' : 'var(--bg-card)',
        color: showNavNotes ? 'var(--text-on-dark)' : 'var(--color-accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <MessageSquare size={18} />
      {navNotes.length > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            minWidth: '18px',
            height: '18px',
            borderRadius: '9px',
            background: 'var(--color-teal)',
            color: 'white',
            fontSize: '0.7rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
          }}
        >
          {navNotes.length}
        </span>
      )}
    </button>
  )}
  {canOwnerEditListingDetail ? (
    <input
      value={listing.address}
      onChange={(e) => setListing({ ...listing, address: e.target.value })}
      onBlur={(e) => handleUpdateField('address', e.target.value)}
      style={{
        fontSize: '2rem',
        fontWeight: 800,
        marginBottom: 'var(--space-2)',
        color: 'var(--text-main)',
        border: 'none',
        background: 'none',
        width: '100%',
        padding: 0,
        outline: 'none',
      }}
      className="editable-h1"
    />
  ) : (
    <h2
      style={{
        fontSize: '2rem',
        marginBottom: 'var(--space-2)',
        color: 'var(--text-main)',
        paddingRight: isNavView ? '48px' : 0,
      }}
    >
      {listing.address}
    </h2>
  )}
  {isOwner && !isNavView && showGalleryFormidlet && (
    <p
      role="status"
      style={{
        margin: '0 0 var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        fontSize: '0.9rem',
        lineHeight: 1.5,
        color: 'var(--text-body)',
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: '12px',
      }}
    >
      {t('ownerCannotEditListingWhenFormidlet')}
    </p>
  )}
  <div
    className="listing-city-line"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      color: 'var(--color-royal-blue)',
      fontSize: '1rem',
    }}
  >
    {isNavView && listing.id ? (
      <Link
        href={`/nav/database?focusListing=${listing.id}`}
        prefetch={false}
        title={t('listingMapPinShowOnMap')}
        aria-label={t('listingMapPinShowOnMap')}
        style={{
          display: 'flex',
          alignItems: 'center',
          color: 'inherit',
          flexShrink: 0,
        }}
      >
        <MapPin
          size={18}
          style={{ color: 'var(--color-royal-blue)', flexShrink: 0 }}
          aria-hidden
        />
      </Link>
    ) : (() => {
        const coords = getListingMapCoords(listing)
        if (!coords) {
          return (
            <MapPin
              size={18}
              style={{ color: 'var(--color-royal-blue)', flexShrink: 0 }}
              aria-hidden
            />
          )
        }
        const { lat, lng: lon } = coords
        const osm = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
        return (
          <a
            href={osm}
            target="_blank"
            rel="noopener noreferrer"
            title={t('listingMapPinShowOnMap')}
            aria-label={t('listingMapPinShowOnMap')}
            style={{
              display: 'flex',
              alignItems: 'center',
              color: 'inherit',
              flexShrink: 0,
            }}
          >
            <MapPin
              size={18}
              style={{ color: 'var(--color-royal-blue)', flexShrink: 0 }}
              aria-hidden
            />
          </a>
        )
      })()}
    {canOwnerEditListingDetail ? (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input
          value={listing.city}
          onChange={(e) => setListing({ ...listing, city: e.target.value })}
          onBlur={(e) => handleUpdateField('city', e.target.value)}
          style={{
            fontWeight: 600,
            color: 'var(--color-royal-blue)',
            WebkitTextFillColor: 'var(--color-royal-blue)',
            border: 'none',
            background: 'none',
            width: '120px',
            padding: 0,
            outline: 'none',
          }}
        />
        <input
          value={listing.postal_code}
          onChange={(e) => setListing({ ...listing, postal_code: e.target.value })}
          onBlur={(e) => handleUpdateField('postal_code', e.target.value)}
          style={{
            fontWeight: 600,
            color: 'var(--color-royal-blue)',
            WebkitTextFillColor: 'var(--color-royal-blue)',
            border: 'none',
            background: 'none',
            width: '80px',
            padding: 0,
            outline: 'none',
          }}
        />
      </div>
    ) : (
      <span style={{ fontWeight: 600, color: 'var(--color-royal-blue)' }}>
        {listing.city} {listing.postal_code}
      </span>
    )}
  </div>
</section>
    </>
  )
}
