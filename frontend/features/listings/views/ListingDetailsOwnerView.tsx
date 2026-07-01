'use client'

import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Edit3,
  FileText,
  Camera,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Maximize2,
  X,
} from 'lucide-react'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'
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
  onUploadMore: (e: React.ChangeEvent<HTMLInputElement>) => void
  onReorderImage: (fromIndex: number, direction: -1 | 1) => void
  t: (key: TranslationKey) => string
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
    onUploadMore,
    onReorderImage,
    t,
  } = props

  return (
    <>
          {/* 5. Bilder */}
          <div
            className={`listing-image-gallery${allImages.length === 0 ? ' listing-image-gallery--empty' : ''}`}
            style={{
              width: '100%',
              aspectRatio: '16/9',
              borderRadius: '24px',
              overflow: 'hidden',
              position: 'relative',
              cursor: allImages.length > 0 ? 'pointer' : 'default',
            }}
          >
            {allImages.length > 0 ? (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsFullscreen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setIsFullscreen(true)
                    }
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    cursor: 'pointer',
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
                    style={{
                      objectFit: 'cover',
                      transition: 'all 0.3s',
                    }}
                  />
                </div>

                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentImageIndex(
                          (prev) => (prev - 1 + allImages.length) % allImages.length
                        )
                      }}
                      style={{
                        position: 'absolute',
                        left: '15px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.5)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        zIndex: 5,
                      }}
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
                      }}
                      style={{
                        position: 'absolute',
                        right: '15px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.5)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        zIndex: 5,
                      }}
                    >
                      <ChevronRight size={24} />
                    </button>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        zIndex: 5,
                      }}
                    >
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsFullscreen(true)
                  }}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    cursor: 'pointer',
                    zIndex: 5,
                  }}
                  title={t('listingFullscreen')}
                >
                  <Maximize2 size={20} />
                </button>
              </>
            ) : (
              <label
                className={`listing-image-placeholder${
                  canOwnerEditListingDetail ? ' listing-image-placeholder--clickable' : ''
                }`}
                style={{ width: '100%', height: '100%' }}
                aria-label={
                  canOwnerEditListingDetail
                    ? `${t('listingImageDropzoneTitle')}. ${t('listingImageDropzoneHint')}`
                    : t('listingImageEmptyViewer')
                }
              >
                {canOwnerEditListingDetail && (
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={onUploadMore}
                    style={{ display: 'none' }}
                  />
                )}
                <span className="listing-image-placeholder-icon-wrap" aria-hidden>
                  <ImagePlus
                    size={32}
                    strokeWidth={1.75}
                    className="listing-image-placeholder-icon"
                  />
                </span>
                <span className="listing-image-placeholder-title">
                  {canOwnerEditListingDetail
                    ? t('listingImageDropzoneTitle')
                    : t('listingImageEmptyViewer')}
                </span>
                {canOwnerEditListingDetail && (
                  <span className="listing-image-placeholder-hint">{t('listingImageDropzoneHint')}</span>
                )}
              </label>
            )}

            {canOwnerEditListingDetail && allImages.length > 0 && (
              <label
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  background: 'var(--color-royal-blue)',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 6,
                }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={onUploadMore}
                  style={{ display: 'none' }}
                />
                {uploading ? <Camera size={18} style={{ opacity: 0.5 }} /> : <Camera size={18} />}
                {uploading ? t('listingImageUploading') : t('listingImageAddPhotos')}
              </label>
            )}

            <div
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                padding: '6px 16px',
                borderRadius: '20px',
                background: showGalleryFormidlet
                  ? 'var(--color-sky-blue)'
                  : listing?.status === 'Tilgjengelig'
                    ? 'var(--color-teal)'
                    : '#ef4444',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.8rem',
                textTransform: showGalleryFormidlet ? 'none' : 'uppercase',
                zIndex: 5,
              }}
            >
              {showGalleryFormidlet ? 'Formidlet' : (listing?.status ?? '')}
            </div>
          </div>

          {canOwnerEditListingDetail && allImages.length > 1 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                marginTop: 'var(--space-3)',
                alignItems: 'flex-end',
              }}
            >
              {allImages.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      overflow: 'hidden',
                      border:
                        idx === currentImageIndex
                          ? '2px solid var(--color-accent)'
                          : '1px solid var(--border-subtle)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentImageIndex(idx)}
                      style={{
                        padding: 0,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%',
                      }}
                      aria-label={`${idx + 1} / ${allImages.length}`}
                    >
                      <OptimizedPublicStorageImage
                        variant="fixed"
                        src={url}
                        alt=""
                        width={56}
                        height={56}
                        sizes="56px"
                        style={{ objectFit: 'cover', display: 'block' }}
                      />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button
                      type="button"
                      className="button"
                      disabled={isSaving === 'image_urls' || idx === 0}
                      onClick={() => void onReorderImage(idx, -1)}
                      style={{ padding: '2px 6px', minHeight: 28, fontSize: '0.7rem' }}
                      title={t('listingImageMoveEarlier')}
                      aria-label={t('listingImageMoveEarlier')}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="button"
                      disabled={isSaving === 'image_urls' || idx >= allImages.length - 1}
                      onClick={() => void onReorderImage(idx, 1)}
                      style={{ padding: '2px 6px', minHeight: 28, fontSize: '0.7rem' }}
                      title={t('listingImageMoveLater')}
                      aria-label={t('listingImageMoveLater')}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fullscreen: portal til document.body så fixed dekker viewport (ikke faner/layout med transform). */}
          {typeof document !== 'undefined' &&
            isFullscreen &&
            allImages.length > 0 &&
            createPortal(
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t('listingFullscreen')}
                style={{
                  position: 'fixed',
                  inset: 0,
                  width: '100%',
                  maxWidth: '100dvw',
                  height: '100dvh',
                  maxHeight: '100vh',
                  background: 'rgba(0,0,0,0.95)',
                  zIndex: 2147483000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  overflow: 'auto',
                  overscrollBehavior: 'contain',
                }}
                onClick={() => setIsFullscreen(false)}
              >
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  style={{
                    position: 'absolute',
                    top: 'max(16px, env(safe-area-inset-top))',
                    right: 'max(16px, env(safe-area-inset-right))',
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '10px',
                    zIndex: 2,
                  }}
                  aria-label={t('close')}
                >
                  <X size={40} />
                </button>

                <div
                  style={{
                    position: 'relative',
                    width: 'min(calc(100dvw - 24px), 1400px)',
                    height: 'min(85dvh, 900px)',
                    maxHeight: '85vh',
                    flex: '0 1 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingInline: 'max(12px, env(safe-area-inset-left)) max(12px, env(safe-area-inset-right))',
                    boxSizing: 'border-box',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    key={`fs-${allImages[currentImageIndex]}`}
                    src={allImages[currentImageIndex]}
                    alt={
                      listing?.address
                        ? `${listing.address} — bilde ${currentImageIndex + 1} av ${allImages.length}`
                        : `Boligbilde ${currentImageIndex + 1} av ${allImages.length}`
                    }
                    decoding="async"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </div>

                {allImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentImageIndex(
                          (prev) => (prev - 1 + allImages.length) % allImages.length
                        )
                      }}
                      style={{
                        position: 'absolute',
                        left: 'max(16px, env(safe-area-inset-left))',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '60px',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        zIndex: 2,
                      }}
                      aria-label={t('listingGalleryPrev')}
                    >
                      <ChevronLeft size={40} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
                      }}
                      style={{
                        position: 'absolute',
                        right: 'max(16px, env(safe-area-inset-right))',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '60px',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        zIndex: 2,
                      }}
                      aria-label={t('listingGalleryNext')}
                    >
                      <ChevronRight size={40} />
                    </button>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'max(20px, env(safe-area-inset-bottom))',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.55)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        color: 'white',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        zIndex: 2,
                      }}
                    >
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
    <section className="card no-hover listing-detail-card" style={{ padding: 'var(--space-6)' }}>
      <h3
        style={{
          margin: '0 0 var(--space-3)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          color: 'var(--text-main)',
          fontSize: '1.05rem',
        }}
      >
        <FileText size={20} style={{ color: 'var(--color-sky-blue)' }} /> {t('houseRulesTitle')}
      </h3>
      <p style={{ margin: '0 0 var(--space-4)', color: 'var(--text-body)', fontSize: '0.9rem', lineHeight: 1.55 }}>
        {t('houseRulesHelp')}
      </p>
      {hasHouseRulesPdf && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
          {houseRulesPublicUrl && (
            <a href={houseRulesPublicUrl} target="_blank" rel="noopener noreferrer" className="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} /> {t('houseRulesOpenPdf')}
            </a>
          )}
          {canOwnerEditListingDetail && (
            <>
              <label className="button button-secondary" style={{ cursor: houseRulesBusy ? 'wait' : 'pointer' }}>
                <input type="file" accept="application/pdf" disabled={houseRulesBusy} style={{ display: 'none' }} onChange={(e) => void onHouseRulesFileChange(e)} />
                {houseRulesBusy ? '…' : t('houseRulesReplace')}
              </label>
              <button type="button" className="button" disabled={houseRulesBusy} onClick={() => void onHouseRulesRemove()} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
                {t('houseRulesRemove')}
              </button>
            </>
          )}
        </div>
      )}
      {!hasHouseRulesPdf && isOwner && !isNavView && (
        <div>
          <p className="text-sm" style={{ margin: '0 0 var(--space-3)', color: 'var(--text-muted)' }}>{t('houseRulesNone')}</p>
          {canOwnerEditListingDetail && (
            <label className="button" style={{ cursor: houseRulesBusy ? 'wait' : 'pointer' }}>
              <input type="file" accept="application/pdf" disabled={houseRulesBusy} style={{ display: 'none' }} onChange={(e) => void onHouseRulesFileChange(e)} />
              {houseRulesBusy ? '…' : t('houseRulesChooseFile')}
            </label>
          )}
          {!canOwnerEditListingDetail && showGalleryFormidlet && (
            <p className="text-sm" style={{ margin: 0, color: 'var(--text-muted)' }}>{t('ownerCannotEditListingWhenFormidlet')}</p>
          )}
        </div>
      )}
    </section>
  )
}

export function ListingDetailsOwnerAdminLink({ isNavView, isOwner }: { isNavView: boolean; isOwner: boolean }) {
  if (isNavView || !isOwner) return null
  return (
    <section className="card listing-detail-card" style={{ padding: 'var(--space-6)' }}>
      <Link href="/homeowner/manage" className="button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
        <Edit3 size={18} /> Administrer denne boligen
      </Link>
    </section>
  )
}

export function ListingDetailsOwnerEditableStyles() {
  return (
    <style jsx>{`
      .editable-h1:hover { background: rgba(0, 0, 0, 0.02) !important; }
      .editable-h1:focus { background: rgba(59, 130, 246, 0.05) !important; border-bottom: 2px solid var(--color-sky-blue) !important; }
      input:focus, select:focus, textarea:focus { background: rgba(59, 130, 246, 0.05) !important; outline: none !important; }
      input, select, textarea { transition: all 0.2s; border-radius: 4px; }
      input[type='number']::-webkit-inner-spin-button, input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    `}</style>
  )
}

export default function ListingDetailsOwnerView(props: ListingDetailsOwnerGalleryProps) {
  return <ListingDetailsOwnerGallery {...props} />
}
