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

/** Map generic status strings to badge variants (non-homeowner fallback). */
export function statusBadgeVariantFor(raw: string): StatusBadgeVariant {
  const s = raw.toLowerCase()
  if (/tilgjengelig|available|paid|completed/.test(s)) return 'success'
  if (/pending|venter|await/.test(s)) return 'pending'
  if (/utilgjengelig|unavailable|reject|cancel|terminated|closed/.test(s)) return 'danger'
  if (/formidla|formidlet|mediated|info/.test(s)) return 'info'
  if (/warn/.test(s)) return 'warning'
  if (/ikke markert|unmarked|draft/.test(s)) return 'neutral'
  if (/accepted|godkjent|approved/.test(s)) return 'success'
  return 'neutral'
}
