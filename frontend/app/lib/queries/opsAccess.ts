import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { fetchAuthUserForQueryClient } from './authUserQuery'

export const opsAccessQueryKey = ['ops', 'access'] as const

export type OpsAccess =
  | { kind: 'unauthenticated' }
  | { kind: 'forbidden' }
  | { kind: 'ok'; userId: string }

export async function fetchOpsAccess(qc: QueryClient): Promise<OpsAccess> {
  const user = await fetchAuthUserForQueryClient(qc)
  if (!user) return { kind: 'unauthenticated' }

  const { data, error } = await supabase.rpc('ops_check_access')
  if (error) throw error
  if (!data) return { kind: 'forbidden' }

  return { kind: 'ok', userId: user.id }
}
