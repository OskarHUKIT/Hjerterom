'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

const DEFAULT_FALLBACK = 'Ukjent bruker'

export async function fetchDisplayNamesBatch(
  userIds: string[],
  fallbackLabel?: string
): Promise<Map<string, string>> {
  const fallback = fallbackLabel ?? DEFAULT_FALLBACK
  const ids = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))]
  if (ids.length === 0) return new Map()

  const { data: batchRows, error: batchErr } = await supabase.rpc('get_user_display_names_batch', {
    p_user_ids: ids,
  })

  if (batchErr) {
    const resolved = await Promise.all(
      ids.map(async (pid) => {
        const { data: name } = await supabase.rpc('get_user_display_name', { p_user_id: pid })
        return { user_id: pid, display_name: name ?? null }
      })
    )
    return new Map(
      resolved.map((r) => [r.user_id, r.display_name?.trim() || fallback])
    )
  }

  return new Map(
    (batchRows || []).map((r: { user_id: string; display_name: string | null }) => [
      r.user_id,
      r.display_name?.trim() || fallback,
    ])
  )
}

export function useDisplayNamesBatch(userIds: string[], fallbackLabel?: string) {
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const idsKey = useMemo(
    () => [...new Set(userIds.map((id) => id.trim()).filter(Boolean))].sort().join('\0'),
    [userIds]
  )

  useEffect(() => {
    const ids = idsKey ? idsKey.split('\0') : []
    if (ids.length === 0) {
      setNames({})
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void fetchDisplayNamesBatch(ids, fallbackLabel).then((map) => {
      if (cancelled) return
      setNames(Object.fromEntries(map))
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [idsKey, fallbackLabel])

  return { names, loading }
}
