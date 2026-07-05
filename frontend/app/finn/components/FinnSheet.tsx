'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

type FinnSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  titleId?: string
  children: ReactNode
  /** Taller sheet for chat (max 80vh) */
  tall?: boolean
}

export default function FinnSheet({
  open,
  onClose,
  title,
  titleId = 'finn-sheet-title',
  children,
  tall,
}: FinnSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        className={`finn-sheet-backdrop${open ? ' finn-sheet-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`finn-sheet${open ? ' finn-sheet--open' : ''}`}
        style={tall ? { maxHeight: '80dvh' } : undefined}
      >
        <div className="finn-sheet__handle" aria-hidden />
        <div className="finn-sheet__body">{children}</div>
      </div>
    </>
  )
}
