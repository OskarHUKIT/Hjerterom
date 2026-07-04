'use client'

import Modal from './Modal'
import { Button } from '../ui/Button'
import { ShieldCheck } from 'lucide-react'
import { isBankIdAutoAcceptEnabled } from '@/app/lib/bankidAutoAccept'

type IdentityVerificationDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  busy?: boolean
  onAutoAccept?: () => void
  autoAcceptLabel?: string
  autoAcceptHint?: string
}

/** Pre-BankID expectation dialog (NPD-5 #17 / ruixen.ui/identity-verification-dialog). */
export default function IdentityVerificationDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel,
  busy,
  onAutoAccept,
  autoAcceptLabel,
  autoAcceptHint,
}: IdentityVerificationDialogProps) {
  const showAutoAccept = Boolean(onAutoAccept && isBankIdAutoAcceptEnabled())

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="ds-identity-dialog">
        <p className="ds-identity-dialog__body">{body}</p>
        <div className="ds-identity-dialog__bankid">
          <ShieldCheck size={20} aria-hidden />
          BankID · Signicat
        </div>
        <div className="ds-identity-dialog__actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="accent" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
        {showAutoAccept ? (
          <>
            <Button
              type="button"
              variant="secondary"
              className="ds-identity-dialog__auto-accept"
              onClick={onAutoAccept}
              disabled={busy}
            >
              {autoAcceptLabel}
            </Button>
            {autoAcceptHint ? <p className="ds-identity-dialog__auto-hint">{autoAcceptHint}</p> : null}
          </>
        ) : null}
      </div>
    </Modal>
  )
}
