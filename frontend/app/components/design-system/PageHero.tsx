'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

type PageHeroProps = {
  title: string
  lead?: string
  eyebrow?: string
  backHref?: string
  backLabel?: string
  children?: ReactNode
  className?: string
  size?: 'default' | 'compact'
  centered?: boolean
}

/**
 * Shared page hero typography — display italic title without full landing aurora.
 */
export default function PageHero({
  title,
  lead,
  eyebrow,
  backHref,
  backLabel,
  children,
  className,
  size = 'default',
  centered = false,
}: PageHeroProps) {
  return (
    <header
      className={[
        'hrt-page-hero',
        size === 'compact' ? 'hrt-page-hero--compact' : '',
        centered ? 'hrt-page-hero--centered' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {backHref && backLabel ? (
        <Link href={backHref} className="hrt-page-hero__back">
          {backLabel}
        </Link>
      ) : null}
      {eyebrow ? <p className="hrt-page-hero__eyebrow">{eyebrow}</p> : null}
      <h1 className="hrt-page-hero__title">{title}</h1>
      {lead ? <p className="hrt-page-hero__lead">{lead}</p> : null}
      {children}
    </header>
  )
}
