'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { buttonClassName } from '../ui/Button'

type PortalCardProps = {
  icon: LucideIcon
  title: string
  description?: string
  ctaLabel: string
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'accent' | 'teal'
  ariaLabel?: string
}

const ICON_TONE: Record<NonNullable<PortalCardProps['variant']>, string> = {
  primary: 'hrt-portal-icon--primary',
  accent: 'hrt-portal-icon--accent',
  teal: 'hrt-portal-icon--teal',
}

export default function PortalCard({
  icon: Icon,
  title,
  description,
  ctaLabel,
  href,
  onClick,
  variant = 'accent',
  ariaLabel,
}: PortalCardProps) {
  const ctaClass = buttonClassName(
    variant === 'primary' ? 'gradient' : 'pill-ghost',
    'hrt-portal-cta-link'
  )

  return (
    <article className="hrt-portal-card">
      <div className="hrt-portal-card__row">
        <div className={`hrt-portal-icon ${ICON_TONE[variant]}`} aria-hidden>
          <Icon size={24} />
        </div>
        <div className="hrt-portal-body">
          <h2 className="hrt-portal-title">{title}</h2>
          {description ? <p className="hrt-portal-desc">{description}</p> : null}
        </div>
      </div>
      <div className="hrt-portal-cta">
        {href ? (
          <Link href={href} className={ctaClass} aria-label={ariaLabel}>
            {ctaLabel} <ArrowRight size={18} aria-hidden />
          </Link>
        ) : (
          <button type="button" className={ctaClass} onClick={onClick} aria-label={ariaLabel}>
            {ctaLabel} <ArrowRight size={18} aria-hidden />
          </button>
        )}
      </div>
    </article>
  )
}
