'use client'

type OpsAlertTone = 'success' | 'error' | 'info'

const toneClass: Record<OpsAlertTone, string> = {
  success: 'ops-alert--success',
  error: 'ops-alert--error',
  info: 'ops-alert--info',
}

export default function OpsAlert({
  children,
  tone = 'info',
}: {
  children: React.ReactNode
  tone?: OpsAlertTone
}) {
  return <div className={`ops-alert ${toneClass[tone]}`} role="status">{children}</div>
}
