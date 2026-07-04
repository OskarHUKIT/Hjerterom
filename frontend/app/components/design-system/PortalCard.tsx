'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { Button, buttonClassName } from '../ui/Button'

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
  const ctaClass = buttonClassName(variant === 'primary' ? 'primary' : 'accent')

  return (
    <article className="card hrt-portal-card">
      <div className={`hrt-portal-icon ${ICON_TONE[variant]}`} aria-hidden>
        <Icon size={26} />
      </div>
      <div className="hrt-portal-body">
        <h2 className="hrt-portal-title">{title}</h2>
        {description ? <p className="hrt-portal-desc">{description}</p> : null}
        <div className="hrt-portal-cta">
          {href ? (
            <Link href={href} className={ctaClass} aria-label={ariaLabel}>
              {ctaLabel} <ArrowRight size={18} aria-hidden />
            </Link>
          ) : (
            <Button type="button" variant={variant === 'primary' ? 'primary' : 'accent'} onClick={onClick}>
              {ctaLabel} <ArrowRight size={18} aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
