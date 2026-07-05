'use client'

import Link from 'next/link'
import {
  CalendarDays,
  Edit3,
  FileText,
  ImagePlus,
} from 'lucide-react'
import StatusBadge from '@/app/components/design-system/StatusBadge'
import { supabase } from '@/app/lib/supabase'
import ListingPhotoManager from '@/features/listings/components/ListingPhotoManager'
import '@/features/listings/listing-photo-manager.css'
import type { ListingDetailsRecord } from '@/app/lib/listingUiTypes'
import type { TranslationKey } from '@/lib/translations'

export type ListingDetailsOwnerGalleryProps = {
  listing: ListingDetailsRecord
  canOwnerEditListingDetail: boolean
  showGalleryFormidlet: boolean
  isOwner: boolean
  isNavView: boolean
  isSaving: string | null
  gateUpload: () => boolean
  onPhotosUpdated: (payload: {
    image_urls: string[]
    image_alts: string[]
    image_url: string | null
  }) => void
  onUploadError: (code?: string) => void
  t: (key: TranslationKey) => string
}

function galleryStatusVariant(showGalleryFormidlet: boolean, status?: string | null) {
  if (showGalleryFormidlet) return 'info' as const
  if (status === 'Tilgjengelig') return 'success' as const
  return 'danger' as const
}

export function ListingDetailsOwnerGallery(props: ListingDetailsOwnerGalleryProps) {
  const {
    listing,
    canOwnerEditListingDetail,
    showGalleryFormidlet,
    isOwner,
    isNavView,
    isSaving,
    gateUpload,
    onPhotosUpdated,
    onUploadError,
    t,
  } = props

  const fallbackAlt = listing?.address
    ? `${listing.address}`
    : t('regImagesSection')

  const showHubCalendarLink = isOwner && !isNavView && Boolean(listing?.id)

  return (
    <section className="listing-owner-gallery card no-hover listing-detail-card">
      <div className="listing-owner-gallery__head">
        <h3 className="listing-section-heading">
          <ImagePlus size={20} aria-hidden /> {t('regImagesSection')}
        </h3>
        <StatusBadge
          label={
            showGalleryFormidlet
              ? t('formidlet')
              : listing?.status === 'Tilgjengelig'
                ? t('available')
                : listing?.status === 'Utilgjengelig'
                  ? t('unavailable')
                  : (listing?.status ?? t('availabilityUnmarked'))
          }
          variant={galleryStatusVariant(showGalleryFormidlet, listing?.status)}
        />
      </div>

      {showGalleryFormidlet ? (
        <div className="listing-owner-gallery__formidla-banner" role="status">
          {t('ownerCannotEditListingWhenFormidlet')}
        </div>
      ) : null}

      {canOwnerEditListingDetail ? (
        <ListingPhotoManager
          mode="immediate"
          listingId={String(listing?.id ?? '')}
          supabase={supabase}
          imageUrls={listing?.image_urls}
          imageAlts={listing?.image_alts}
          fallbackAlt={fallbackAlt}
          disabled={showGalleryFormidlet}
          saving={isSaving === 'image_urls'}
          beforeUpload={gateUpload}
          onPersist={onPhotosUpdated}
          onError={(code) => onUploadError(code)}
          t={t}
        />
      ) : listing?.image_urls || listing?.image_url ? (
        <ListingPhotoManager
          mode="immediate"
          imageUrls={listing?.image_urls ?? (listing?.image_url ? [listing.image_url] : [])}
          imageAlts={listing?.image_alts}
          fallbackAlt={fallbackAlt}
          disabled
          t={t}
        />
      ) : (
        <div className="listing-image-placeholder" aria-label={t('listingImageEmptyViewer')}>
          <span className="listing-image-placeholder-icon-wrap" aria-hidden>
            <ImagePlus size={32} strokeWidth={1.75} className="listing-image-placeholder-icon" />
          </span>
          <span className="listing-image-placeholder-title">{t('listingImageEmptyViewer')}</span>
        </div>
      )}

      {showHubCalendarLink ? (
        <Link
          href={`/homeowner/listings/${listing.id}#hub-calendar-heading`}
          className="listing-owner-gallery__calendar-link"
        >
          <CalendarDays size={18} aria-hidden />
          {t('manageCalendarLink')}
        </Link>
      ) : null}
    </section>
  )
}

export type ListingDetailsOwnerHouseRulesProps = {
  listing: ListingDetailsRecord
  hasHouseRulesPdf: boolean
  houseRulesPublicUrl: string | null
  canOwnerEditListingDetail: boolean
  showGalleryFormidlet: boolean
  isOwner: boolean
  isNavView: boolean
  houseRulesBusy: boolean
  onHouseRulesFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onHouseRulesRemove: () => void
  t: (key: TranslationKey) => string
}

export function ListingDetailsOwnerHouseRules({
  hasHouseRulesPdf,
  houseRulesPublicUrl,
  canOwnerEditListingDetail,
  showGalleryFormidlet,
  isOwner,
  isNavView,
  houseRulesBusy,
  onHouseRulesFileChange,
  onHouseRulesRemove,
  t,
}: ListingDetailsOwnerHouseRulesProps) {
  if (!hasHouseRulesPdf && !(isOwner && !isNavView)) return null
  return (
    <section className="card no-hover listing-detail-card">
      <h3 className="listing-house-rules-title">
        <FileText size={20} /> {t('houseRulesTitle')}
      </h3>
      <p className="listing-house-rules-body">{t('houseRulesHelp')}</p>
      {hasHouseRulesPdf && (
        <div className="listing-house-rules-actions">
          {houseRulesPublicUrl && (
            <a
              href={houseRulesPublicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button listing-house-rules-link"
            >
              <FileText size={18} /> {t('houseRulesOpenPdf')}
            </a>
          )}
          {canOwnerEditListingDetail && (
            <>
              <label
                className={`button button-secondary listing-house-rules-upload${
                  houseRulesBusy ? ' is-busy' : ''
                }`}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={houseRulesBusy}
                  className="listing-hidden-input"
                  onChange={(e) => void onHouseRulesFileChange(e)}
                />
                {houseRulesBusy ? '…' : t('houseRulesReplace')}
              </label>
              <button
                type="button"
                className="button listing-house-rules-danger"
                disabled={houseRulesBusy}
                onClick={() => void onHouseRulesRemove()}
              >
                {t('houseRulesRemove')}
              </button>
            </>
          )}
        </div>
      )}
      {!hasHouseRulesPdf && isOwner && !isNavView && (
        <div>
          <p className="text-sm listing-house-rules-empty">{t('houseRulesNone')}</p>
          {canOwnerEditListingDetail && (
            <label
              className={`button listing-house-rules-upload${
                houseRulesBusy ? ' is-busy' : ''
              }`}
            >
              <input
                type="file"
                accept="application/pdf"
                disabled={houseRulesBusy}
                className="listing-hidden-input"
                onChange={(e) => void onHouseRulesFileChange(e)}
              />
              {houseRulesBusy ? '…' : t('houseRulesChooseFile')}
            </label>
          )}
          {!canOwnerEditListingDetail && showGalleryFormidlet && (
            <p className="text-sm listing-house-rules-muted">
              {t('ownerCannotEditListingWhenFormidlet')}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

export function ListingDetailsOwnerAdminLink({ isNavView, isOwner }: { isNavView: boolean; isOwner: boolean }) {
  if (isNavView || !isOwner) return null
  return (
    <section className="card listing-detail-card">
      <Link href="/homeowner/manage" className="button listing-admin-link">
        <Edit3 size={18} /> Administrer denne boligen
      </Link>
    </section>
  )
}

/** @deprecated Focus styles live in listing-details-shared.css */
export function ListingDetailsOwnerEditableStyles() {
  return null
}

export default function ListingDetailsOwnerView(props: ListingDetailsOwnerGalleryProps) {
  return <ListingDetailsOwnerGallery {...props} />
}
