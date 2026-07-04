'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { buttonClassName } from '../ui/Button'

export type InteractiveEmptyStateAction = {
  label: string
  href?: string
  onClick?: () => void
  icon?: ReactNode
}

export type InteractiveEmptyStateProps = {
  title: string
  description?: string
  action?: InteractiveEmptyStateAction
  /** Calm floating icon cluster (pass 2–3 small lucide icons). */
  icons?: ReactNode[]
  variant?: 'default' | 'subtle'
  size?: 'default' | 'sm'
  className?: string
}

/** Modular empty state with gentle icon motion (remcostoeten/interactive-empty-state → Boly tokens). */
export default function InteractiveEmptyState({
  title,
  description,
  action,
  icons,
  variant = 'default',
  size = 'default',
  className,
}: InteractiveEmptyStateProps) {
  const rootClass = [
    'ds-interactive-empty',
    'card',
    variant === 'subtle' ? 'ds-interactive-empty--subtle' : '',
    size === 'sm' ? 'ds-interactive-empty--sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const actionClass = buttonClassName('accent', 'ds-interactive-empty__cta')

  return (
    <div className={rootClass} role="status">
      {icons && icons.length > 0 ? (
        <div className="ds-interactive-empty__icons" aria-hidden>
          {icons.map((icon, index) => (
            <span
              key={index}
              className={`ds-interactive-empty__icon ds-interactive-empty__icon--${index + 1}`}
            >
              {icon}
            </span>
          ))}
        </div>
      ) : null}

      <h2 className="ds-interactive-empty__title">{title}</h2>
      {description ? <p className="ds-interactive-empty__body">{description}</p> : null}

      {action ? (
        <div className="ds-interactive-empty__action">
          {action.href ? (
            <Link href={action.href} className={actionClass}>
              {action.icon}
              {action.label}
            </Link>
          ) : (
            <button type="button" className={actionClass} onClick={action.onClick}>
              {action.icon}
              {action.label}
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
