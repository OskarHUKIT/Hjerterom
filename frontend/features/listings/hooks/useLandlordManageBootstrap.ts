'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { landlordOnboardingKey, LANDLORD_ONBOARDING_PREFIX } from '@/app/lib/landlordOnboarding'
import {
  PWA_PROMPT_DISMISSED_KEY,
  PWA_PROMPT_MANAGE_SESSION_KEY,
  shouldShowPwaPrompt,
} from '@/app/components/PWAInstallPrompt'
import { getLandlordPostLoginHref } from '@/app/lib/landlordNavGate'
import { logError } from '@/app/lib/appLogger'
import type { ManagePageGate } from '@/features/listings/lib/landlordManagePageGate'

type UseLandlordManageBootstrapOptions = {
  refetch: () => Promise<void>
  loading: boolean
  setLoading: (loading: boolean) => void
  setFetchError: (error: 'timeout' | string | null) => void
}

export function useLandlordManageBootstrap({
  refetch,
  loading,
  setLoading,
  setFetchError,
}: UseLandlordManageBootstrapOptions) {
  const router = useRouter()
  const [pageGate, setPageGate] = useState<ManagePageGate>('init')
  const [pendingPwaAfterWelcome, setPendingPwaAfterWelcome] = useState(false)
  const [pendingPwaBeforeOverview, setPendingPwaBeforeOverview] = useState(false)
  const pageGateRef = useRef(pageGate)
  pageGateRef.current = pageGate

  useEffect(() => {
    let cancelled = false
    /** Må være > auth-timeout i supabase.ts (22s) og gi tid til trege spørringer. */
    const STUCK_MS = 60000
    const stuckTimer = window.setTimeout(() => {
      if (cancelled) return
      // Ikke vis feil mens velkomst-modal er åpen (bruker kan bruke >20s der).
      if (pageGateRef.current === 'welcome') return
      setPageGate((g) => (g === 'init' ? 'ready' : g))
      setFetchError('timeout')
      setLoading(false)
    }, STUCK_MS)

    async function bootstrap() {
      let user: Awaited<ReturnType<typeof getAuthUserDeduped>>
      try {
        user = await getAuthUserDeduped()
      } catch (e: unknown) {
        if (cancelled) return
        logError(e)
        setFetchError(e instanceof Error ? e.message : 'error')
        setPageGate('ready')
        setLoading(false)
        return
      }
      if (!user) {
        if (!cancelled) {
          setLoading(false)
          router.push('/login')
        }
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (isKommuneStaffRole(profile?.role)) {
        if (!cancelled) {
          setLoading(false)
          router.replace('/nav/database')
        }
        return
      }
      const gateHref = await getLandlordPostLoginHref(supabase, user.id, user.email, {
        reuseProfileRole: profile?.role ?? null,
      })
      if (gateHref !== '/homeowner/manage') {
        if (!cancelled) {
          setLoading(false)
          router.replace(gateHref)
        }
        return
      }
      const dismissed =
        typeof window !== 'undefined' &&
        localStorage.getItem(landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.welcome, user.id))
      if (!dismissed) {
        if (!cancelled) {
          setPageGate('welcome')
          setLoading(false)
        }
        return
      }
      if (!cancelled) setPageGate('ready')
      await refetch()
    }

    void bootstrap().finally(() => {
      if (!cancelled) window.clearTimeout(stuckTimer)
    })

    return () => {
      cancelled = true
      window.clearTimeout(stuckTimer)
    }
  }, [refetch, router, setFetchError, setLoading])

  useEffect(() => {
    if (pageGate !== 'ready' || !loading) return
    const id = window.setTimeout(() => {
      setFetchError('timeout')
      setLoading(false)
    }, 60000)
    return () => clearTimeout(id)
  }, [loading, pageGate, setFetchError, setLoading])

  const dismissLandlordWelcome = useCallback(async () => {
    const user = await getAuthUserDeduped()
    if (user && typeof window !== 'undefined') {
      localStorage.setItem(landlordOnboardingKey(LANDLORD_ONBOARDING_PREFIX.welcome, user.id), '1')
    }
    let managePwaDone = false
    try {
      managePwaDone = sessionStorage.getItem(PWA_PROMPT_MANAGE_SESSION_KEY) === '1'
    } catch {
      managePwaDone = false
    }
    if (shouldShowPwaPrompt() && !managePwaDone) {
      setPendingPwaAfterWelcome(true)
      return
    }
    setPageGate('ready')
    await refetch()
  }, [refetch])

  const dismissPwaAfterWelcome = useCallback(
    (remember: boolean) => {
      try {
        if (remember) localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, '1')
        sessionStorage.setItem(PWA_PROMPT_MANAGE_SESSION_KEY, '1')
      } catch {
        /* ignore */
      }
      setPendingPwaAfterWelcome(false)
      setPageGate('ready')
      void refetch()
    },
    [refetch]
  )

  return {
    pageGate,
    pendingPwaAfterWelcome,
    pendingPwaBeforeOverview,
    setPendingPwaBeforeOverview,
    dismissLandlordWelcome,
    dismissPwaAfterWelcome,
  }
}
