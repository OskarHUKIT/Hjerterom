'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import StatusBadge, { statusBadgeVariantFor, type StatusBadgeVariant } from './StatusBadge'

export type PropertyCardProps = {
  href: string
  title: string
  meta?: string
  priceLabel?: string
  imageUrl?: string | null
  imageAlt?: string
  placeholder?: string
  statusLabel?: string
  statusVariant?: StatusBadgeVariant
  footer?: ReactNode
  className?: string
}

/** Shared listing preview card (NPD-5 #9). */
export default function PropertyCard({
  href,
  title,
  meta,
  priceLabel,
  imageUrl,
  imageAlt = '',
  placeholder,
  statusLabel,
  statusVariant,
  footer,
  className,
}: PropertyCardProps) {
  const badgeVariant = statusVariant ?? (statusLabel ? statusBadgeVariantFor(statusLabel) : 'neutral')

  return (
    <Link href={href} className={`ds-property-card${className ? ` ${className}` : ''}`}>
      <div className="ds-property-card__image">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={imageAlt} loading="lazy" />
        ) : (
          <div className="ds-property-card__placeholder">{placeholder ?? '—'}</div>
        )}
      </div>
      <div className="ds-property-card__body">
        <h2 className="ds-property-card__title">{title}</h2>
        {meta ? <p className="ds-property-card__meta">{meta}</p> : null}
        <div className="ds-property-card__footer">
          {priceLabel ? <span className="ds-property-card__price">{priceLabel}</span> : <span />}
          {statusLabel ? <StatusBadge label={statusLabel} variant={badgeVariant} /> : null}
        </div>
        {footer}
      </div>
    </Link>
  )
}
