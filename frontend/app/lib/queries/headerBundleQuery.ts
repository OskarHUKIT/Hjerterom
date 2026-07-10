import { supabase } from '../supabase'
import { isKommuneStaffRole } from '../kommuneRoles'
import { getLandlordPostLoginHref } from '../landlordNavGate'

export const headerBundleQueryKey = (userId: string) => ['header', 'bundle', userId] as const

export type HeaderBundle = {
  role: string
  kommuneCanEdit: boolean | null
  hasSignedTerms: boolean
  landlordBootstrapHref: string
  unreadCount: number
  unreadMessageCount: number
  losInboxNewCount: number
}

export async function fetchHeaderBundle(
  userId: string,
  metadata: { role?: string } | null | undefined,
  email: string | null | undefined
): Promise<HeaderBundle> {
  const metadataRole = metadata?.role

  const [profileRes, agreementRes] = await Promise.all([
    supabase.from('profiles').select('role, kommune_can_edit').eq('id', userId).maybeSingle(),
    supabase
      .from('user_agreements')
      .select('id')
      .eq('user_id', userId)
      .eq('is_terminated', false)
      .maybeSingle(),
  ])

  const userRole = profileRes.data?.role || metadataRole || 'homeowner'
  const kommuneCanEdit = profileRes.data?.kommune_can_edit ?? null
  const hasSignedTerms = !!agreementRes.data

  const unreadQuery = supabase.rpc('count_my_unread_notifications')

  const unreadMessagesQuery = supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false)

  const losInboxQuery = isKommuneStaffRole(userRole)
    ? supabase
        .from('los_handoffs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new')
    : Promise.resolve({ count: 0, error: null })

  const landlordHrefPromise =
    isKommuneStaffRole(userRole) || agreementRes.data
      ? Promise.resolve('/homeowner/manage')
      : getLandlordPostLoginHref(supabase, userId, email ?? null, {
          reuseProfileRole: userRole,
        })

  const [
    { data: unreadCountRaw, error: unreadError },
    { count: unreadMessageCountRaw, error: unreadMessagesError },
    { count: losInboxNewCountRaw, error: losInboxError },
    landlordBootstrapHref,
  ] = await Promise.all([
    unreadQuery,
    unreadMessagesQuery,
    losInboxQuery,
    landlordHrefPromise,
  ])

  if (unreadError) throw unreadError
  if (unreadMessagesError) throw unreadMessagesError
  if (losInboxError) throw losInboxError

  return {
    role: userRole,
    kommuneCanEdit,
    hasSignedTerms,
    landlordBootstrapHref,
    unreadCount: typeof unreadCountRaw === 'number' ? unreadCountRaw : 0,
    unreadMessageCount: typeof unreadMessageCountRaw === 'number' ? unreadMessageCountRaw : 0,
    losInboxNewCount: typeof losInboxNewCountRaw === 'number' ? losInboxNewCountRaw : 0,
  }
}
