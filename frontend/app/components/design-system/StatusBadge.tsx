'use client'

export type StatusBadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'pending'

type StatusBadgeProps = {
  label: string
  variant?: StatusBadgeVariant
  className?: string
}

export default function StatusBadge({ label, variant = 'neutral', className }: StatusBadgeProps) {
  return (
    <span className={`ds-status-badge ds-status-badge--${variant}${className ? ` ${className}` : ''}`}>
      {label}
    </span>
  )
}

/** Map listing / booking status strings to badge variants. */
export function statusBadgeVariantFor(raw: string): StatusBadgeVariant {
  const s = raw.toLowerCase()
  if (/paid|godkjent|approved|active|tilgjengelig|available|signed|formidla|mediated/.test(s)) {
    return 'success'
  }
  if (/pending|accepted|new|venter|await/.test(s)) return 'pending'
  if (/cancel|reject|expired|utilgjengelig|unavailable|terminated|closed/.test(s)) return 'danger'
  if (/draft|info/.test(s)) return 'info'
  if (/warn/.test(s)) return 'warning'
  return 'neutral'
}
