'use client'

import Modal from './Modal'
import { Button } from '../ui/Button'
import { ShieldCheck } from 'lucide-react'

type IdentityVerificationDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  busy?: boolean
}

/** Pre-BankID expectation dialog (NPD-5 #17). */
export default function IdentityVerificationDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel,
  busy,
}: IdentityVerificationDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p style={{ margin: 0, lineHeight: 1.55, color: 'var(--text-body)' }}>{body}</p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3)',
            borderRadius: 10,
            background: 'color-mix(in srgb, var(--color-royal-blue) 10%, transparent)',
            fontSize: '0.875rem',
          }}
        >
          <ShieldCheck size={20} aria-hidden style={{ flexShrink: 0 }} />
          BankID
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="accent" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
