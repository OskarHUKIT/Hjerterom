'use client'

import type { Dispatch, SetStateAction } from 'react'
import Link from 'next/link'
import { MessageSquare, MapPin } from 'lucide-react'
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

function MapPinLink({
  listing,
  isNavView,
  t,
}: {
  listing: any
  isNavView: boolean
  t: (key: any) => string
}) {
  if (isNavView && listing.id) {
    return (
      <Link
        href={`/nav/database?focusListing=${listing.id}`}
        prefetch={false}
        title={t('listingMapPinShowOnMap')}
        aria-label={t('listingMapPinShowOnMap')}
        className="listing-map-link"
      >
        <MapPin size={18} className="listing-map-pin" aria-hidden />
      </Link>
    )
  }

  const coords = getListingMapCoords(listing)
  if (!coords) {
    return <MapPin size={18} className="listing-map-pin" aria-hidden />
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
      className="listing-map-link"
    >
      <MapPin size={18} className="listing-map-pin" aria-hidden />
    </a>
  )
}

export default function ListingDetailsAddressSection(props: ListingDetailsAddressSectionProps) {
  const {
    listing,
    setListing,
    isNavView,
    isOwner,
    showNavNotes,
    setShowNavNotes,
    navNotes,
    canOwnerEditListingDetail,
    showGalleryFormidlet,
    handleUpdateField,
    t,
  } = props

  return (
    <section className="card listing-detail-card listing-address-section">
      {isNavView && (
        <button
          type="button"
          onClick={() => setShowNavNotes((prev) => !prev)}
          title={showNavNotes ? t('hideNoteCaseworker') : t('showNoteCaseworker')}
          className={`listing-nav-notes-btn${showNavNotes ? ' listing-nav-notes-btn--active' : ''}`}
        >
          <MessageSquare size={18} />
          {navNotes.length > 0 && (
            <span className="listing-nav-notes-badge">{navNotes.length}</span>
          )}
        </button>
      )}

      {canOwnerEditListingDetail ? (
        <input
          value={listing.address}
          onChange={(e) => setListing({ ...listing, address: e.target.value })}
          onBlur={(e) => handleUpdateField('address', e.target.value)}
          className="editable-h1 listing-address-title-input"
        />
      ) : (
        <h2
          className={`listing-address-title${isNavView ? ' listing-address-title--nav' : ''}`}
        >
          {listing.address}
        </h2>
      )}

      {isOwner && !isNavView && showGalleryFormidlet && (
        <p role="status" className="listing-formidlet-notice">
          {t('ownerCannotEditListingWhenFormidlet')}
        </p>
      )}

      <div className="listing-city-line">
        <MapPinLink listing={listing} isNavView={isNavView} t={t} />
        {canOwnerEditListingDetail ? (
          <div className="listing-city-inputs">
            <input
              value={listing.city}
              onChange={(e) => setListing({ ...listing, city: e.target.value })}
              onBlur={(e) => handleUpdateField('city', e.target.value)}
              className="listing-city-input listing-city-input--city"
            />
            <input
              value={listing.postal_code}
              onChange={(e) => setListing({ ...listing, postal_code: e.target.value })}
              onBlur={(e) => handleUpdateField('postal_code', e.target.value)}
              className="listing-city-input listing-city-input--postal"
            />
          </div>
        ) : (
          <span className="listing-city-read">
            {listing.city} {listing.postal_code}
          </span>
        )}
      </div>
    </section>
  )
}
