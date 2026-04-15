import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { fetchAuthUserForQueryClient } from './authUserQuery'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email_notifications_enabled')
    .eq('id', user.id)
    .maybeSingle()

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error

  return {
    userId: user.id,
    role: profile?.role || 'homeowner',
    emailNotificationsEnabled: profile?.email_notifications_enabled === true,
    rows: data || [],
  }
}
