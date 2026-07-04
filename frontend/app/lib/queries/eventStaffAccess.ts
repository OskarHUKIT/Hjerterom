import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { isEventStaffRole } from '../eventStaffRoles'
import { fetchAuthUserForQueryClient } from './authUserQuery'
import { QK } from './queryKeys'

export const eventStaffAccessQueryKey = QK.eventStaffAccess

export type EventStaffAccess =
  | { kind: 'unauthenticated' }
  | { kind: 'forbidden' }
  | { kind: 'ok'; userId: string; userRole: string }

/** Single gate for event staff /nav/event/* pages. Cached via TanStack Query. */
export async function fetchEventStaffAccess(qc: QueryClient): Promise<EventStaffAccess> {
  const user = await fetchAuthUserForQueryClient(qc)
  if (!user) return { kind: 'unauthenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const userRole = profile?.role ?? null
  if (!isEventStaffRole(userRole)) return { kind: 'forbidden' }

  return { kind: 'ok', userId: user.id, userRole: userRole! }
}
