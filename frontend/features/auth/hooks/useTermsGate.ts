'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import type { TranslationKey } from '@/lib/translations'

export function signTermsHref(city: string, returnTo: string): string {
  return `/homeowner/sign-terms?city=${encodeURIComponent((city || '').trim())}&returnTo=${encodeURIComponent(returnTo)}`
}

/** Unified gate for landlord actions that require an active signed agreement. */
export function useTermsGate() {
  const router = useRouter()
  const { t } = useLanguage()
  const toast = useToast()

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
      router.push(signTermsHref(city, returnTo))
      return false
    },
    [router, t, toast]
  )

  return { requireActiveAgreement, signTermsHref }
}
