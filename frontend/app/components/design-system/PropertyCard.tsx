'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import StatusBadge, { statusBadgeVariantFor, type StatusBadgeVariant } from './StatusBadge'

export type PropertyCardProps = {
  href?: string
  title: string
  meta?: string
  priceLabel?: string
  imageUrl?: string | null
  imageAlt?: string
  placeholder?: string
  statusLabel?: string
  statusVariant?: StatusBadgeVariant
  /** Custom image slot (e.g. OptimizedPublicStorageImage). Overrides imageUrl. */
  image?: ReactNode
  /** Custom status slot (e.g. ListingStatusBadge). Overrides statusLabel. */
  status?: ReactNode
  footer?: ReactNode
  /** Trailing actions (CTA, kebab menu). Row layout only. */
  actions?: ReactNode
  layout?: 'stack' | 'row'
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
  image,
  status,
  footer,
  actions,
  layout = 'stack',
  className,
}: PropertyCardProps) {
  const badgeVariant = statusVariant ?? (statusLabel ? statusBadgeVariantFor(statusLabel) : 'neutral')
  const cardClass = `ds-property-card${layout === 'row' ? ' ds-property-card--row' : ''}${className ? ` ${className}` : ''}`

  const imageNode =
    image ??
    (imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={imageAlt} loading="lazy" />
    ) : (
      <div className="ds-property-card__placeholder">{placeholder ?? '—'}</div>
    ))

  const statusNode =
    status ?? (statusLabel ? <StatusBadge label={statusLabel} variant={badgeVariant} /> : null)

  if (layout === 'row') {
    return (
      <article className={cardClass}>
        <div className="ds-property-card__image">{imageNode}</div>
        <div className="ds-property-card__body">
          <div className="ds-property-card__head">
            <h2 className="ds-property-card__title">{title}</h2>
            {statusNode}
          </div>
          {meta ? <p className="ds-property-card__meta">{meta}</p> : null}
          {footer}
        </div>
        {actions ? <div className="ds-property-card__actions">{actions}</div> : null}
      </article>
    )
  }

  const stackBody = (
    <>
      <div className="ds-property-card__image">{imageNode}</div>
      <div className="ds-property-card__body">
        <h2 className="ds-property-card__title">{title}</h2>
        {meta ? <p className="ds-property-card__meta">{meta}</p> : null}
        <div className="ds-property-card__footer">
          {priceLabel ? <span className="ds-property-card__price">{priceLabel}</span> : <span />}
          {statusNode}
        </div>
        {footer}
      </div>
    </>
  )

  if (!href) {
    return <article className={cardClass}>{stackBody}</article>
  }

  return (
    <Link href={href} className={cardClass}>
      {stackBody}
    </Link>
  )
}
