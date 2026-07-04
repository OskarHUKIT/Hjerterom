'use client'

import { useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Edit3,
  FileText,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Maximize2,
  X,
} from 'lucide-react'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'
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
  currentImageIndex: number
  setCurrentImageIndex: React.Dispatch<React.SetStateAction<number>>
  isFullscreen: boolean
  setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>
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
    currentImageIndex,
    setCurrentImageIndex,
    isFullscreen,
    setIsFullscreen,
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

  const galleryClassName = [
    'listing-image-gallery',
    allImages.length === 0 ? 'listing-image-gallery--empty' : 'listing-image-gallery--has-images',
  ].join(' ')

  return (
    <>
      <div className={galleryClassName}>
        {allImages.length > 0 ? (
          <>
            <div
              role="button"
              tabIndex={0}
              className="listing-gallery-hitarea"
              onClick={() => setIsFullscreen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIsFullscreen(true)
                }
              }}
              aria-label={t('listingFullscreen')}
            >
              <OptimizedPublicStorageImage
                key={allImages[currentImageIndex]}
                variant="fill"
                src={allImages[currentImageIndex]}
                alt={
                  listing?.address
                    ? `${listing.address} — bilde ${currentImageIndex + 1} av ${allImages.length}`
                    : `Boligbilde ${currentImageIndex + 1} av ${allImages.length}`
                }
                sizes="100vw"
                quality={95}
                priority={currentImageIndex === 0}
                className="listing-gallery-image"
              />
            </div>

            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="listing-gallery-nav-btn listing-gallery-nav-btn--prev"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex(
                      (prev) => (prev - 1 + allImages.length) % allImages.length
                    )
                  }}
                  aria-label={t('listingGalleryPrev')}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  className="listing-gallery-nav-btn listing-gallery-nav-btn--next"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
                  }}
                  aria-label={t('listingGalleryNext')}
                >
                  <ChevronRight size={24} />
                </button>
                <div className="listing-gallery-counter listing-gallery-counter--center">
                  {currentImageIndex + 1} / {allImages.length}
                </div>
              </>
            )}

            <button
              type="button"
              className="listing-gallery-fullscreen-btn"
              onClick={(e) => {
                e.stopPropagation()
                setIsFullscreen(true)
              }}
              title={t('listingFullscreen')}
              aria-label={t('listingFullscreen')}
            >
              <Maximize2 size={20} />
            </button>
          </>
        ) : (
          canOwnerEditListingDetail ? (
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
          )
        )}

        {canOwnerEditListingDetail && allImages.length > 0 && (
          <div className="listing-gallery-upload-label" style={{ marginTop: 'var(--space-3)' }}>
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
          </div>
        )}

        <div className="listing-gallery-status-badge-wrap">
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
      </div>

      {allImages.length > 1 ? (
        <GalleryGrid
          className="listing-gallery-grid-block"
          images={allImages.map((src, idx) => ({
            src,
            alt: listing?.address
              ? `${listing.address} (${idx + 1}/${allImages.length})`
              : `${idx + 1}/${allImages.length}`,
          }))}
        />
      ) : null}

      {canOwnerEditListingDetail && allImages.length > 1 ? (
        <div className="listing-gallery-thumbs">
          {allImages.map((url, idx) => (
            <div key={`${url}-${idx}`} className="listing-gallery-thumb-col">
              <div
                className={`listing-gallery-thumb-wrap${
                  idx === currentImageIndex ? ' listing-gallery-thumb-wrap--active' : ''
                }`}
              >
                <button
                  type="button"
                  className="listing-gallery-thumb-btn"
                  onClick={() => setCurrentImageIndex(idx)}
                  aria-label={`${idx + 1} / ${allImages.length}`}
                >
                  <OptimizedPublicStorageImage
                    variant="fixed"
                    src={url}
                    alt=""
                    width={56}
                    height={56}
                    sizes="56px"
                    className="listing-gallery-thumb-img"
                  />
                </button>
              </div>
              <div className="listing-gallery-reorder-row">
                <button
                  type="button"
                  className="button listing-gallery-reorder-btn"
                  disabled={isSaving === 'image_urls' || idx === 0}
                  onClick={() => void onReorderImage(idx, -1)}
                  title={t('listingImageMoveEarlier')}
                  aria-label={t('listingImageMoveEarlier')}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  className="button listing-gallery-reorder-btn"
                  disabled={isSaving === 'image_urls' || idx >= allImages.length - 1}
                  onClick={() => void onReorderImage(idx, 1)}
                  title={t('listingImageMoveLater')}
                  aria-label={t('listingImageMoveLater')}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {typeof document !== 'undefined' &&
        isFullscreen &&
        allImages.length > 0 &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('listingFullscreen')}
            className="listing-fullscreen-overlay"
            onClick={() => setIsFullscreen(false)}
          >
            <button
              type="button"
              className="listing-fullscreen-close"
              onClick={() => setIsFullscreen(false)}
              aria-label={t('close')}
            >
              <X size={40} />
            </button>

            <div className="listing-fullscreen-stage" onClick={(e) => e.stopPropagation()}>
              <img
                key={`fs-${allImages[currentImageIndex]}`}
                src={allImages[currentImageIndex]}
                alt={
                  listing?.address
                    ? `${listing.address} — bilde ${currentImageIndex + 1} av ${allImages.length}`
                    : `Boligbilde ${currentImageIndex + 1} av ${allImages.length}`
                }
                decoding="async"
                className="listing-fullscreen-img"
              />
            </div>

            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="listing-fullscreen-nav listing-fullscreen-nav--prev"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex(
                      (prev) => (prev - 1 + allImages.length) % allImages.length
                    )
                  }}
                  aria-label={t('listingGalleryPrev')}
                >
                  <ChevronLeft size={40} />
                </button>
                <button
                  type="button"
                  className="listing-fullscreen-nav listing-fullscreen-nav--next"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
                  }}
                  aria-label={t('listingGalleryNext')}
                >
                  <ChevronRight size={40} />
                </button>
                <div className="listing-fullscreen-counter">
                  {currentImageIndex + 1} / {allImages.length}
                </div>
              </>
            )}
          </div>,
          document.body
        )}
    </>
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
