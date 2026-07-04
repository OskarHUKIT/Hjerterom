'use client'

import dynamic from 'next/dynamic'
import { useState, type ReactNode } from 'react'
import { OptimizedPublicStorageImage } from '@/app/components/OptimizedPublicStorageImage'

const GalleryLightbox = dynamic(() => import('./GalleryLightbox'), { ssr: false })

export type GalleryGridImage = {
  src: string
  alt?: string
}

type GalleryGridProps = {
  images: GalleryGridImage[]
  className?: string
  /** reapollo/gallery-grid-block — featured first tile + grid (default). */
  variant?: 'simple' | 'block'
  renderItemFooter?: (index: number) => ReactNode
  closeLabel?: string
  prevLabel?: string
  nextLabel?: string
}

/** Photo grid with lazy lightbox (NPD-5 #19 / reapollo gallery-grid-block). */
export default function GalleryGrid({
  images,
  className,
  variant = 'block',
  renderItemFooter,
  closeLabel = 'Close',
  prevLabel = 'Previous',
  nextLabel = 'Next',
}: GalleryGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (images.length === 0) return null

  const gridClass =
    variant === 'block'
      ? `ds-gallery-grid-block${images.length === 1 ? ' ds-gallery-grid-block--single' : ''}${images.length === 2 ? ' ds-gallery-grid-block--duo' : ''}`
      : 'ds-gallery-grid'

  return (
    <>
      <div className={`${gridClass}${className ? ` ${className}` : ''}`}>
        {images.map((img, i) => {
          const isHero = variant === 'block' && images.length >= 3 && i === 0
          return (
            <div
              key={`${img.src}-${i}`}
              className={`ds-gallery-grid-block__cell${isHero ? ' ds-gallery-grid-block__cell--hero' : ''}`}
            >
              <button
                type="button"
                className="ds-gallery-grid-block__item"
                onClick={() => setLightboxIndex(i)}
                aria-label={img.alt ?? `Photo ${i + 1}`}
              >
                <OptimizedPublicStorageImage
                  variant="fill"
                  src={img.src}
                  alt={img.alt ?? ''}
                  sizes={
                    isHero
                      ? '(max-width: 768px) 100vw, 50vw'
                      : '(max-width: 768px) 50vw, 25vw'
                  }
                  priority={i === 0}
                  className="ds-gallery-grid-block__img"
                />
              </button>
              {renderItemFooter ? (
                <div className="ds-gallery-grid-block__footer">{renderItemFooter(i)}</div>
              ) : null}
            </div>
          )
        })}
      </div>
      {lightboxIndex != null ? (
        <GalleryLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          closeLabel={closeLabel}
          prevLabel={prevLabel}
          nextLabel={nextLabel}
        />
      ) : null}
    </>
  )
}
