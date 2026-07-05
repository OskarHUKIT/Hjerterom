'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Home,
  ImagePlus,
  Trash2,
} from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { FileUploadCard } from '@/components/ui/file-upload-card'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'
import { useImageUpload } from '@/hooks/useImageUpload'
import {
  buildListingImageEntries,
  type ListingImageEntry,
} from '@/features/listings/lib/listingImageMetadata'
import {
  LISTING_IMAGE_ACCEPT,
  MAX_LISTING_IMAGES,
} from '@/features/listings/lib/listingImageUpload'
import type { TranslationKey } from '@/lib/translations'

export type ListingPhotoManagerProps = {
  mode: 'immediate' | 'staging'
  listingId?: string
  supabase?: SupabaseClient
  imageUrls?: unknown
  imageAlts?: unknown
  fallbackAlt?: string
  disabled?: boolean
  saving?: boolean
  maxImages?: number
  beforeUpload?: () => boolean
  onPersist?: (payload: {
    image_urls: string[]
    image_alts: string[]
    image_url: string | null
  }) => void | Promise<void>
  onError?: (code: string) => void
  onStagedChange?: (files: File[], alts: string[]) => void
  className?: string
  t: (key: TranslationKey) => string
}

export default function ListingPhotoManager({
  mode,
  listingId,
  supabase,
  imageUrls,
  imageAlts,
  fallbackAlt = '',
  disabled,
  saving,
  maxImages = MAX_LISTING_IMAGES,
  beforeUpload,
  onPersist,
  onError,
  onStagedChange,
  className,
  t,
}: ListingPhotoManagerProps) {
  const initialEntries = buildListingImageEntries(imageUrls, imageAlts, fallbackAlt)

  const {
    entries,
    uploadQueue,
    busy,
    handleFilesChange,
    removeUploadItem,
    removePhoto,
    movePhotoEarlier,
    movePhotoLater,
    updateAlt,
    getStagedFiles,
    getStagedAlts,
  } = useImageUpload({
    mode,
    listingId,
    supabase,
    maxImages,
    initialEntries,
    defaultAlt: fallbackAlt,
    disabled: disabled || saving,
    beforeUpload,
    onPersist,
    onError: (code) => onError?.(code),
  })

  const onStagedChangeRef = useRef(onStagedChange)
  onStagedChangeRef.current = onStagedChange

  useEffect(() => {
    if (mode !== 'staging') return
    onStagedChangeRef.current?.(getStagedFiles(), getStagedAlts())
  }, [entries, getStagedAlts, getStagedFiles, mode])

  const slotsLeft = Math.max(0, maxImages - entries.length)
  const uploadDisabled = disabled || saving || busy || slotsLeft <= 0

  const handleReorderKey = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp' && index > 0) {
        e.preventDefault()
        void movePhotoEarlier(index)
      }
      if (e.key === 'ArrowDown' && index < entries.length - 1) {
        e.preventDefault()
        void movePhotoLater(index)
      }
    },
    [entries.length, movePhotoEarlier, movePhotoLater]
  )

  const uploadHint = t('uploadDropzoneHint').replace('{max}', String(maxImages))

  return (
    <div className={`listing-photo-manager${className ? ` ${className}` : ''}`}>
      {entries.length > 0 ? (
        <ul className="listing-photo-grid" aria-label={t('regImagesSection')}>
          {entries.map((entry: ListingImageEntry, index) => (
            <li
              key={entry.id}
              className="listing-photo-grid__item"
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => handleReorderKey(index, e)}
              aria-label={t('listingPhotoGridItem').replace('{n}', String(index + 1))}
            >
              <div className="listing-photo-grid__thumb-wrap">
                {entry.url.startsWith('blob:') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.url} alt={entry.alt || fallbackAlt} className="listing-photo-grid__thumb" />
                ) : (
                  <OptimizedPublicStorageImage
                    variant="fill"
                    src={entry.url}
                    alt={entry.alt || fallbackAlt}
                    sizes="(max-width: 768px) 50vw, 200px"
                    className="listing-photo-grid__thumb-img"
                  />
                )}
                {index === 0 ? (
                  <span className="listing-photo-grid__cover-badge">{t('listingPhotoCover')}</span>
                ) : null}
              </div>

              <label className="listing-photo-grid__alt-label">
                <span className="sr-only">{t('listingPhotoAltLabel')}</span>
                <input
                  type="text"
                  className="input listing-photo-grid__alt-input"
                  value={entry.alt}
                  disabled={disabled || saving}
                  placeholder={t('listingPhotoAltPlaceholder')}
                  onChange={(e) => void updateAlt(entry.id, e.target.value)}
                />
              </label>

              {!disabled ? (
                <div className="listing-photo-grid__actions">
                  <button
                    type="button"
                    className="listing-gallery-reorder-btn"
                    disabled={saving || index === 0}
                    onClick={() => void movePhotoEarlier(index)}
                    title={t('listingImageMoveEarlier')}
                    aria-label={t('listingImageMoveEarlier')}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="listing-gallery-reorder-btn"
                    disabled={saving || index >= entries.length - 1}
                    onClick={() => void movePhotoLater(index)}
                    title={t('listingImageMoveLater')}
                    aria-label={t('listingImageMoveLater')}
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    className="listing-gallery-reorder-btn listing-photo-grid__delete"
                    disabled={saving}
                    onClick={() => void removePhoto(entry.id)}
                    title={t('listingPhotoDelete')}
                    aria-label={t('listingPhotoDelete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : mode === 'immediate' && !disabled ? null : (
        <div className="listing-image-placeholder listing-image-placeholder--branded" aria-hidden>
          <span className="listing-image-placeholder-icon-wrap">
            <ImagePlus size={32} strokeWidth={1.75} className="listing-image-placeholder-icon" />
          </span>
        </div>
      )}

      {!disabled ? (
        <FileUploadCard
          className="listing-photo-manager__upload"
          files={uploadQueue}
          onFilesChange={(files) => void handleFilesChange(files)}
          onFileRemove={removeUploadItem}
          disabled={uploadDisabled}
          accept={LISTING_IMAGE_ACCEPT}
          title={entries.length ? t('listingImageAddPhotos') : t('uploadDropzoneTitle')}
          subtitle={uploadHint}
          dropzonePrimary={t('listingImageDropzoneTitle')}
          dropzoneSecondary={t('listingImageDropzoneHint')}
          browseLabel={t('listingPhotoBrowse')}
        />
      ) : null}
    </div>
  )
}

/** Branded gradient placeholder for listings without a cover photo. */
export function ListingCoverPlaceholder({
  label,
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={`listing-cover-placeholder${className ? ` ${className}` : ''}`}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <Home size={36} strokeWidth={1.5} aria-hidden className="listing-cover-placeholder__icon" />
      {label ? <span className="listing-cover-placeholder__label">{label}</span> : null}
    </div>
  )
}
