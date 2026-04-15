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
      .select('*')
      .eq('user_id', userId)
      .eq('is_terminated', false)
      .maybeSingle(),
  ])

  const userRole = profileRes.data?.role || metadataRole || 'homeowner'
  const kommuneCanEdit = profileRes.data?.kommune_can_edit ?? null
  const hasSignedTerms = !!agreementRes.data

  let landlordBootstrapHref = '/homeowner/manage'
  if (isKommuneStaffRole(userRole) || agreementRes.data) {
    landlordBootstrapHref = '/homeowner/manage'
  } else {
    landlordBootstrapHref = await getLandlordPostLoginHref(supabase, userId, email ?? null, {
      reuseProfileRole: userRole,
    })
  }

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unread')
    .eq('owner_id', userId)

  return {
    role: userRole,
    kommuneCanEdit,
    hasSignedTerms,
    landlordBootstrapHref,
    unreadCount: count ?? 0,
  }
}
