'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/app/lib/useFocusTrap'
import { Button } from '../ui/Button'
import { useLanguage } from '@/context/LanguageContext'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  titleId?: string
  children: ReactNode
  maxWidth?: number
}

export default function Modal({
  open,
  onClose,
  title,
  titleId = 'hrt-modal-title',
  children,
  maxWidth = 420,
}: ModalProps) {
  const { t } = useLanguage()
  const trapRef = useFocusTrap(open, onClose)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="hrt-modal-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div
        ref={trapRef}
        className="hrt-modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hrt-modal-header">
          <h2 id={titleId} className="hrt-modal-title">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            className="hrt-modal-close"
            onClick={onClose}
            aria-label={t('close')}
          >
            <X size={20} aria-hidden />
          </Button>
        </div>
        <div className="hrt-modal-body">{children}</div>
      </div>
    </div>
  )
}
