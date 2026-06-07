'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import LoadingPlaceholder from '../components/LoadingPlaceholder'

/**
 * Legacy public diagnostics URL — redirect operators to /ops/security, others to login.
 */
export default function DiagnosticsPage() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        router.replace('/login?redirect=/ops/security')
        return
      }
      const { data } = await supabase.rpc('ops_check_access')
      if (cancelled) return
      if (data) {
        router.replace('/ops/security')
      } else {
        router.replace('/')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main className="container" style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingPlaceholder minHeight={120} />
    </main>
  )
}
