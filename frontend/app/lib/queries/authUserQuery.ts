import type { User } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import { getAuthUserDeduped } from '../supabase'
import { QK } from './queryKeys'

/** Re-export for imports that expect `authUserQueryKey`; same tuple as `QK.authUser`. */
export const authUserQueryKey = QK.authUser

const AUTH_USER_STALE_MS = 120_000

/**
 * Resolves the current user once per stale window and shares the result across
 * landlord gate, kommune access, chat bootstrap, notifications list, etc.
 */
export async function fetchAuthUserForQueryClient(qc: QueryClient): Promise<User | null> {
  return qc.fetchQuery({
    queryKey: authUserQueryKey,
    queryFn: getAuthUserDeduped,
    staleTime: AUTH_USER_STALE_MS,
    gcTime: 15 * 60 * 1000,
  })
}
