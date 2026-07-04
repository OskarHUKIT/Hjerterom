'use client'

import Link from 'next/link'

type StatisticsCardProps = {
  label: string
  value: string | number
  delta?: number | null
  deltaLabel?: string
  detailsHref?: string
  detailsLabel?: string
  className?: string
}

/** KPI card with optional delta badge (NPD-5 #20). */
export default function StatisticsCard({
  label,
  value,
  delta,
  deltaLabel,
  detailsHref,
  detailsLabel,
  className,
}: StatisticsCardProps) {
  const deltaTone =
    delta == null || delta === 0
      ? 'flat'
      : delta > 0
        ? 'up'
        : 'down'
  const deltaText =
    delta == null
      ? null
      : deltaLabel ?? (delta > 0 ? `+${delta}` : delta === 0 ? '0' : String(delta))

  return (
    <article className={`ds-stat-card${className ? ` ${className}` : ''}`}>
      <p className="ds-stat-card__label">{label}</p>
      <div className="ds-stat-card__row">
        <p className="ds-stat-card__value">{value}</p>
        {deltaText != null ? (
          <span className={`ds-stat-card__delta ds-stat-card__delta--${deltaTone}`}>{deltaText}</span>
        ) : null}
      </div>
      {detailsHref && detailsLabel ? (
        <Link href={detailsHref} className="ds-stat-card__link">
          {detailsLabel}
        </Link>
      ) : null}
    </article>
  )
}
