'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Edit3,
  FileText,
  ImagePlus,
} from 'lucide-react'
import StatusBadge from '@/app/components/design-system/StatusBadge'
import GalleryGrid from '@/app/components/design-system/GalleryGrid'
import FileUploadCard from '@/app/components/design-system/FileUploadCard'
import { MAX_LISTING_IMAGES } from '@/features/listings/lib/listingImageUpload'
import type { ListingDetailsRecord } from '@/app/lib/listingUiTypes'
import type { TranslationKey } from '@/lib/translations'

export type ListingDetailsOwnerGalleryProps = {
  listing: ListingDetailsRecord
  allImages: string[]
  canOwnerEditListingDetail: boolean
  showGalleryFormidlet: boolean
  isOwner: boolean
  isNavView: boolean
  uploading: boolean
  isSaving: string | null
  onUploadImage: (file: File, onProgress: (pct: number) => void) => Promise<void>
  onUploadError: () => void
  onReorderImage: (fromIndex: number, direction: -1 | 1) => void
  t: (key: TranslationKey) => string
}

function uploadHint(t: (key: TranslationKey) => string) {
  return t('uploadDropzoneHint').replace('{max}', String(MAX_LISTING_IMAGES))
}

function uploadProgressLabel(t: (key: TranslationKey) => string, pct: number) {
  return t('uploadProgress').replace('{pct}', String(Math.round(pct)))
}

function galleryStatusVariant(showGalleryFormidlet: boolean, status?: string | null) {
  if (showGalleryFormidlet) return 'info' as const
  if (status === 'Tilgjengelig') return 'success' as const
  return 'danger' as const
}

export function ListingDetailsOwnerGallery(props: ListingDetailsOwnerGalleryProps) {
  const {
    listing,
    allImages,
    canOwnerEditListingDetail,
    showGalleryFormidlet,
    isOwner,
    isNavView,
    uploading,
    isSaving,
    onUploadImage,
    onUploadError,
    onReorderImage,
    t,
  } = props

  const uploadFile = useCallback(
    async (file: File, onProgress: (pct: number) => void) => {
      try {
        await onUploadImage(file, onProgress)
      } catch {
        onUploadError()
      }
    },
    [onUploadImage, onUploadError]
  )

  const galleryImages = allImages.map((src, idx) => ({
    src,
    alt: listing?.address
      ? `${listing.address} (${idx + 1}/${allImages.length})`
      : `${idx + 1}/${allImages.length}`,
  }))

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

      {allImages.length > 0 ? (
        <GalleryGrid
          variant="block"
          className="listing-gallery-grid-block"
          images={galleryImages}
          closeLabel={t('close')}
          prevLabel={t('listingGalleryPrev')}
          nextLabel={t('listingGalleryNext')}
          renderItemFooter={
            canOwnerEditListingDetail && allImages.length > 1
              ? (idx) => (
                  <>
                    <button
                      type="button"
                      className="listing-gallery-reorder-btn"
                      disabled={isSaving === 'image_urls' || idx === 0}
                      onClick={(e) => {
                        e.stopPropagation()
                        void onReorderImage(idx, -1)
                      }}
                      title={t('listingImageMoveEarlier')}
                      aria-label={t('listingImageMoveEarlier')}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="listing-gallery-reorder-btn"
                      disabled={isSaving === 'image_urls' || idx >= allImages.length - 1}
                      onClick={(e) => {
                        e.stopPropagation()
                        void onReorderImage(idx, 1)
                      }}
                      title={t('listingImageMoveLater')}
                      aria-label={t('listingImageMoveLater')}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </>
                )
              : undefined
          }
        />
      ) : canOwnerEditListingDetail ? (
        <FileUploadCard
          title={t('uploadDropzoneTitle')}
          hint={uploadHint(t)}
          progressLabel={(pct) => uploadProgressLabel(t, pct)}
          maxFiles={MAX_LISTING_IMAGES}
          currentCount={0}
          disabled={uploading}
          uploadFile={uploadFile}
          onUploadError={onUploadError}
        />
      ) : (
        <div className="listing-image-placeholder" aria-label={t('listingImageEmptyViewer')}>
          <span className="listing-image-placeholder-icon-wrap" aria-hidden>
            <ImagePlus size={32} strokeWidth={1.75} className="listing-image-placeholder-icon" />
          </span>
          <span className="listing-image-placeholder-title">{t('listingImageEmptyViewer')}</span>
        </div>
      )}

      {canOwnerEditListingDetail && allImages.length > 0 ? (
        <FileUploadCard
          title={uploading ? t('listingImageUploading') : t('listingImageAddPhotos')}
          hint={uploadHint(t)}
          progressLabel={(pct) => uploadProgressLabel(t, pct)}
          maxFiles={MAX_LISTING_IMAGES}
          currentCount={allImages.length}
          disabled={uploading || allImages.length >= MAX_LISTING_IMAGES}
          uploadFile={uploadFile}
          onUploadError={onUploadError}
          className="listing-gallery-upload-zone"
        />
      ) : null}

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
