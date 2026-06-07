'use client'

type OpsBadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const toneClass: Record<OpsBadgeTone, string> = {
  success: 'ops-badge--success',
  warning: 'ops-badge--warning',
  danger: 'ops-badge--danger',
  info: 'ops-badge--info',
  neutral: 'ops-badge--neutral',
}

export default function OpsBadge({
  children,
  tone = 'neutral',
  dot,
}: {
  children: React.ReactNode
  tone?: OpsBadgeTone
  dot?: boolean
}) {
  return (
    <span className={`ops-badge ${toneClass[tone]}`}>
      {dot ? <span className="ops-badge-dot" aria-hidden /> : null}
      {children}
    </span>
  )
}

export function opsHealthTone(health: string): OpsBadgeTone {
  if (health === 'green') return 'success'
  if (health === 'amber') return 'warning'
  if (health === 'red') return 'danger'
  return 'neutral'
}

export function opsSecurityTone(status: string): OpsBadgeTone {
  if (status === 'ok') return 'success'
  if (status === 'warning') return 'warning'
  if (status === 'critical') return 'danger'
  return 'neutral'
}

export function opsSeverityTone(severity: string): OpsBadgeTone {
  if (severity === 'error') return 'danger'
  if (severity === 'warn' || severity === 'warning') return 'warning'
  if (severity === 'info') return 'info'
  return 'neutral'
}

export function opsKommuneStatusTone(status: string): OpsBadgeTone {
  if (status === 'active') return 'success'
  if (status === 'pilot') return 'info'
  if (status === 'suspended') return 'danger'
  if (status === 'draft') return 'neutral'
  return 'neutral'
}
