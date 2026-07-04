'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

const GalleryLightbox = dynamic(() => import('./GalleryLightbox'), { ssr: false })

type GalleryGridProps = {
  images: { src: string; alt?: string }[]
  className?: string
}

/** Photo grid with lazy lightbox (NPD-5 #19). */
export default function GalleryGrid({ images, className }: GalleryGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (images.length === 0) return null

  return (
    <>
      <div className={`ds-gallery-grid${className ? ` ${className}` : ''}`}>
        {images.map((img, i) => (
          <button
            key={`${img.src}-${i}`}
            type="button"
            className="ds-gallery-grid__item"
            onClick={() => setLightboxIndex(i)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt={img.alt ?? ''} loading="lazy" />
          </button>
        ))}
      </div>
      {lightboxIndex != null ? (
        <GalleryLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      ) : null}
    </>
  )
}
