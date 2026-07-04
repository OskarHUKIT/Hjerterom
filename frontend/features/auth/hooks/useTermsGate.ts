'use client'

import { useCallback } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { useSignTermsIdentityGate } from '@/features/auth/hooks/useSignTermsIdentityGate'
import type { TranslationKey } from '@/lib/translations'
import { buildSignTermsHref } from '@/features/auth/lib/signTermsNavigation'

export function signTermsHref(city: string, returnTo: string): string {
  return buildSignTermsHref({ city, returnTo })
}

/** Unified gate for landlord actions that require an active signed agreement. */
export function useTermsGate() {
  const { t } = useLanguage()
  const toast = useToast()
  const { requestSignTerms, SignTermsIdentityDialog } = useSignTermsIdentityGate()

  const requireActiveAgreement = useCallback(
    (
      hasActiveAgreement: boolean,
      city: string,
      returnTo: string,
      options?: { messageKey?: TranslationKey; silent?: boolean }
    ): boolean => {
      if (hasActiveAgreement) return true
      if (!options?.silent) {
        toast(t(options?.messageKey ?? 'signAgreementToEdit'), 'error')
      }
      requestSignTerms(signTermsHref(city, returnTo))
      return false
    },
    [requestSignTerms, t, toast]
  )

  return { requireActiveAgreement, signTermsHref, SignTermsIdentityDialog }
}
