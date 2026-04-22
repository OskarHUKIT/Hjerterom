import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { fetchAuthUserForQueryClient } from './authUserQuery'
import type { LandlordNavGateResult } from './landlordNavGateQuery'
import { landlordNavGateQueryKey } from './landlordNavGateQuery'

export const notificationsListQueryKey = ['notifications', 'list'] as const

export type NotificationsListPayload = {
  userId: string
  role: string
  emailNotificationsEnabled: boolean
  rows: any[]
}

export async function fetchNotificationsList(qc: QueryClient): Promise<NotificationsListPayload | null> {
  const user = await fetchAuthUserForQueryClient(qc)
  if (!user) return null

  const gate = qc.getQueryData<LandlordNavGateResult>(landlordNavGateQueryKey)
  const gateProfile =
    gate?.kind === 'ready' && gate.user.id === user.id ? gate.profile : null

  const notificationsQuery = supabase
    .from('notifications')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const profileQuery =
    gateProfile != null
      ? Promise.resolve({
          data: {
            role: gateProfile.role,
            email_notifications_enabled: gateProfile.email_notifications_enabled,
          },
          error: null,
        })
      : supabase
          .from('profiles')
          .select('role, email_notifications_enabled')
          .eq('id', user.id)
          .maybeSingle()

  const [{ data: profile, error: profileError }, { data, error }] = await Promise.all([
    profileQuery,
    notificationsQuery,
  ])

  if (profileError) throw profileError
  if (error) throw error

  return {
    userId: user.id,
    role: profile?.role || 'homeowner',
    emailNotificationsEnabled: profile?.email_notifications_enabled === true,
    rows: data || [],
  }
}
