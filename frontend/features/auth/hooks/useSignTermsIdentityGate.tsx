'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import IdentityVerificationDialog from '@/app/components/design-system/IdentityVerificationDialog'
import { useToast } from '@/app/components/design-system'
import { isBankIdAutoAcceptEnabled } from '@/app/lib/bankidAutoAccept'
import { parseSignTermsHref } from '@/features/auth/lib/signTermsNavigation'

/** Pre-BankID dialog before navigating to /homeowner/sign-terms (landlord flows only). */
export function useSignTermsIdentityGate() {
  const router = useRouter()
  const { t } = useLanguage()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const pendingHrefRef = useRef<string | null>(null)
  const onCompleteRef = useRef<(() => void) | null>(null)

  const requestSignTerms = useCallback((href: string, options?: { onComplete?: () => void }) => {
    pendingHrefRef.current = href
    onCompleteRef.current = options?.onComplete ?? null
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    if (busy) return
    setOpen(false)
    pendingHrefRef.current = null
    onCompleteRef.current = null
  }, [busy])

  const proceed = useCallback(() => {
    const href = pendingHrefRef.current
    setOpen(false)
    pendingHrefRef.current = null
    onCompleteRef.current = null
    if (href) router.push(href)
  }, [router])

  const handleAutoAccept = useCallback(async () => {
    const href = pendingHrefRef.current
    if (!href || !isBankIdAutoAcceptEnabled()) return
    const parsed = parseSignTermsHref(href)
    setBusy(true)
    try {
      const res = await fetch('/api/dev/auto-accept-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: parsed.city || undefined,
          termsDocumentId: parsed.doc || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Auto-accept failed')
      }
      toast(t('signTermsAutoAcceptSuccess'), 'success')
      setOpen(false)
      pendingHrefRef.current = null
      const onComplete = onCompleteRef.current
      onCompleteRef.current = null
      router.replace(parsed.returnTo)
      onComplete?.()
    } catch (err: unknown) {
      toast(t('signTermsStartError') + String((err as Error)?.message ?? err), 'error')
    } finally {
      setBusy(false)
    }
  }, [router, t, toast])

  const SignTermsIdentityDialog = useCallback(
    () => (
      <IdentityVerificationDialog
        open={open}
        onClose={close}
        onConfirm={proceed}
        onAutoAccept={isBankIdAutoAcceptEnabled() ? () => void handleAutoAccept() : undefined}
        autoAcceptLabel={t('signTermsAutoAccept')}
        autoAcceptHint={t('signTermsAutoAcceptHint')}
        title={t('identityDialogTitle')}
        body={t('identityDialogBody')}
        confirmLabel={t('identityDialogContinue')}
        cancelLabel={t('cancel')}
        busy={busy}
      />
    ),
    [open, close, proceed, handleAutoAccept, t, busy]
  )

  return { requestSignTerms, SignTermsIdentityDialog, identityDialogOpen: open }
}
