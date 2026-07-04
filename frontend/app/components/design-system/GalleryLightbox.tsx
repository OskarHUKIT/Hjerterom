'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'
import type { GalleryGridImage } from './GalleryGrid'

type GalleryLightboxProps = {
  images: GalleryGridImage[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
  closeLabel?: string
  prevLabel?: string
  nextLabel?: string
}

export default function GalleryLightbox({
  images,
  index,
  onClose,
  onNavigate,
  closeLabel = 'Close',
  prevLabel = 'Previous',
  nextLabel = 'Next',
}: GalleryLightboxProps) {
  const img = images[index]
  if (!img) return null

  return (
    <div
      className="ds-gallery-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={img.alt ?? `Photo ${index + 1}`}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
        if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1)
        if (e.key === 'ArrowRight' && index < images.length - 1) onNavigate(index + 1)
      }}
    >
      <button type="button" className="ds-gallery-lightbox__close" onClick={onClose} aria-label={closeLabel}>
        ×
      </button>

      <div className="ds-gallery-lightbox__stage" onClick={(e) => e.stopPropagation()}>
        <OptimizedPublicStorageImage
          key={img.src}
          variant="fill"
          src={img.src}
          alt={img.alt ?? ''}
          sizes="100vw"
          unoptimized
          priority
          className="ds-gallery-lightbox__img"
        />
      </div>

      {images.length > 1 ? (
        <>
          <button
            type="button"
            className="ds-gallery-lightbox__nav ds-gallery-lightbox__nav--prev"
            disabled={index <= 0}
            onClick={(e) => {
              e.stopPropagation()
              onNavigate(index - 1)
            }}
            aria-label={prevLabel}
          >
            <ChevronLeft size={32} />
          </button>
          <button
            type="button"
            className="ds-gallery-lightbox__nav ds-gallery-lightbox__nav--next"
            disabled={index >= images.length - 1}
            onClick={(e) => {
              e.stopPropagation()
              onNavigate(index + 1)
            }}
            aria-label={nextLabel}
          >
            <ChevronRight size={32} />
          </button>
          <div className="ds-gallery-lightbox__counter" aria-live="polite">
            {index + 1} / {images.length}
          </div>
        </>
      ) : null}
    </div>
  )
}
