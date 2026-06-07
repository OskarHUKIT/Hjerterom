import { supabase } from './supabase'

export async function setNotificationStatus(
  notificationId: string,
  status: 'unread' | 'completed'
): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('set_notification_status', {
    p_notification_id: notificationId,
    p_status: status,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  const payload = data as { ok?: boolean; error?: string; updated?: number } | null
  if (!payload?.ok) {
    return { ok: false, error: payload?.error || 'unknown_error' }
  }

  return { ok: true, updated: payload.updated ?? 0 }
}
