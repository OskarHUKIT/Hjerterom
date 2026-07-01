'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type UseAsyncQueryOptions = {
  enabled?: boolean
}

type UseAsyncQueryResult<T> = {
  data: T | undefined
  error: Error | null
  isPending: boolean
  refetch: () => void
}

export function useAsyncQuery<T>(
  queryFn: () => Promise<T>,
  deps: readonly unknown[],
  options?: UseAsyncQueryOptions
): UseAsyncQueryResult<T> {
  const enabled = options?.enabled ?? true
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isPending, setIsPending] = useState(enabled)
  const queryFnRef = useRef(queryFn)
  queryFnRef.current = queryFn
  const [refetchToken, setRefetchToken] = useState(0)

  const refetch = useCallback(() => {
    setRefetchToken((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setIsPending(false)
      return
    }

    let cancelled = false

    void (async () => {
      setIsPending(true)
      setError(null)
      try {
        const result = await queryFnRef.current()
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        if (!cancelled) setIsPending(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps supplied by caller
  }, [enabled, refetchToken, ...deps])

  return { data, error, isPending, refetch }
}
