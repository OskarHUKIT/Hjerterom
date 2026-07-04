'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import StatusBadge, { type StatusBadgeVariant } from './StatusBadge'
import { Button, buttonClassName } from '../ui/Button'

export type NotificationAction = {
  id: string
  label: string
  onClick?: () => void
  href?: string
  variant?: 'accent' | 'secondary' | 'danger'
  disabled?: boolean
}

export type NotificationWithActionsItem = {
  id: string
  title: string
  meta?: string
  body?: string | null
  statusLabel?: string
  statusVariant?: StatusBadgeVariant
  primaryActions?: NotificationAction[]
  secondaryActions?: NotificationAction[]
}

type NotificationsWithActionsProps = {
  title?: string
  items: NotificationWithActionsItem[]
  loading?: boolean
  loadingRows?: number
  className?: string
  id?: string
}

function NotificationActionControl({ action }: { action: NotificationAction }) {
  const className =
    action.variant === 'accent'
      ? buttonClassName('accent', 'ds-notifications-actions__btn')
      : action.variant === 'danger'
        ? buttonClassName('danger', 'ds-notifications-actions__btn')
        : buttonClassName('secondary', 'ds-notifications-actions__btn')

  if (action.href) {
    return (
      <Link
        href={action.href}
        className={buttonClassName('secondary', 'ds-notifications-actions__btn ds-notifications-actions__btn--link')}
        aria-disabled={action.disabled}
      >
        {action.label}
      </Link>
    )
  }

  return (
    <Button
      type="button"
      variant={action.variant === 'danger' ? 'danger' : action.variant === 'accent' ? 'accent' : 'secondary'}
      className="ds-notifications-actions__btn"
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {action.label}
    </Button>
  )
}

function NotificationSkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="ds-notifications-actions__item ds-notifications-actions__item--skeleton">
          <div className="ds-notifications-actions__content">
            <div className="ds-notifications-actions__skeleton-line ds-notifications-actions__skeleton-line--title" />
            <div className="ds-notifications-actions__skeleton-line ds-notifications-actions__skeleton-line--meta" />
          </div>
          <div className="ds-notifications-actions__actions">
            <div className="ds-notifications-actions__skeleton-btn" />
            <div className="ds-notifications-actions__skeleton-btn" />
          </div>
        </li>
      ))}
    </>
  )
}

/** Notification strip with inline primary/secondary actions (ruixen.ui/notifications-with-actions → Boly tokens). */
export default function NotificationsWithActions({
  title,
  items,
  loading = false,
  loadingRows = 1,
  className,
  id,
}: NotificationsWithActionsProps) {
  const rootClass = `ds-notifications-actions card${className ? ` ${className}` : ''}`

  if (!loading && items.length === 0) {
    return null
  }

  return (
    <section className={rootClass} id={id} aria-busy={loading || undefined}>
      {title ? <h3 className="ds-notifications-actions__heading">{title}</h3> : null}
      <ul className="ds-notifications-actions__list">
        {loading ? (
          <NotificationSkeletonRows count={loadingRows} />
        ) : (
          items.map((item) => (
            <li key={item.id} className="ds-notifications-actions__item">
              <div className="ds-notifications-actions__content">
                <div className="ds-notifications-actions__head">
                  <p className="ds-notifications-actions__title">{item.title}</p>
                  {item.statusLabel ? (
                    <StatusBadge label={item.statusLabel} variant={item.statusVariant ?? 'neutral'} />
                  ) : null}
                </div>
                {item.meta ? <p className="ds-notifications-actions__meta">{item.meta}</p> : null}
                {item.body ? <p className="ds-notifications-actions__body">{item.body}</p> : null}
              </div>
              {item.primaryActions?.length || item.secondaryActions?.length ? (
                <div className="ds-notifications-actions__actions">
                  {item.primaryActions?.map((action) => (
                    <NotificationActionControl key={action.id} action={action} />
                  ))}
                  {item.secondaryActions?.map((action) => (
                    <NotificationActionControl key={action.id} action={action} />
                  ))}
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
