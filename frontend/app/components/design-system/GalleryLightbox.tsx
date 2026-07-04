'use client'

type GalleryLightboxProps = {
  images: { src: string; alt?: string }[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export default function GalleryLightbox({ images, index, onClose, onNavigate }: GalleryLightboxProps) {
  const img = images[index]
  if (!img) return null

  return (
    <div
      className="ds-gallery-lightbox"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
        if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1)
        if (e.key === 'ArrowRight' && index < images.length - 1) onNavigate(index + 1)
      }}
    >
      <button type="button" className="ds-gallery-lightbox__close" onClick={onClose} aria-label="Close">
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.src} alt={img.alt ?? ''} onClick={(e) => e.stopPropagation()} />
    </div>
  )
}
