'use client'

import { useEffect, useState } from 'react'

type DismissibleAlertProps = {
  storageKey?: string
  tone?: 'info' | 'warning'
  children: React.ReactNode
  className?: string
}

/** Calm inline alert — dismiss persists in sessionStorage (NPD-5 #20 alerts). */
export default function DismissibleAlert({
  storageKey,
  tone = 'info',
  children,
  className,
}: DismissibleAlertProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!storageKey) return
    try {
      if (sessionStorage.getItem(storageKey) === '1') setVisible(false)
    } catch {
      /* ignore */
    }
  }, [storageKey])

  const dismiss = () => {
    setVisible(false)
    if (storageKey) {
      try {
        sessionStorage.setItem(storageKey, '1')
      } catch {
        /* ignore */
      }
    }
  }

  if (!visible) return null

  return (
    <div
      className={`ds-dismissible-alert${tone === 'warning' ? ' ds-dismissible-alert--warning' : ''}${className ? ` ${className}` : ''}`}
      role="status"
    >
      <div className="ds-dismissible-alert__body">{children}</div>
      <button type="button" className="ds-dismissible-alert__close" onClick={dismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
