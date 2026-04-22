'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  chatUserBootstrapQueryKey,
  fetchChatUserBootstrap,
} from '../lib/queries/chatUserBootstrap'

export function useChatUserBootstrap() {
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: chatUserBootstrapQueryKey,
    queryFn: () => fetchChatUserBootstrap(queryClient),
    staleTime: 60_000,
    gcTime: 10 * 60 * 1000,
  })

  useEffect(() => {
    if (!q.data) return
    if (q.data.kind === 'anon') {
      window.location.replace('/login')
      return
    }
    if (q.data.kind === 'redirect') {
      window.location.replace(q.data.href)
    }
  }, [q.data])

  return q
}
