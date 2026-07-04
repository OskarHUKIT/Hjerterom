import { supabase } from './supabase'

export type OpsDashboardStats = {
  users_total: number
  users_homeowner: number
  users_kommune_staff: number
  users_kommune_admin: number
  listings_total: number
  agreements_active: number
  agreements_terminated: number
  terms_pending: number
  terms_approved: number
  resign_pending: number
  sign_events_7d: number
  sign_events_30d: number
  operators_active: number
}

export type OpsTimeSeries = {
  signups_by_week: { week_start: string; count: number }[]
  listings_by_week: { week_start: string; count: number }[]
  terms_approved_by_week: { week_start: string; count: number }[]
  listings_by_region: { region: string; count: number }[]
}

export type OpsUserListItem = {
  id: string
  email_masked: string
  full_name: string | null
  role: string | null
  kommune_region: string | null
  kommune_can_edit: boolean
  has_active_agreement: boolean
  created_at: string
}

export type OpsKommuneGrant = {
  kommune_id: string
  slug: string
  display_name: string
  region_keys: string[]
  grant_role: 'staff' | 'admin'
  can_edit: boolean
  granted_at: string
}

export type OpsLandlordKommuneScope = {
  kommune_id: string
  display_name: string
  service_areas: string[]
}

export type OpsUserDetail = {
  id: string
  email: string
  email_full: string
  full_name: string | null
  role: string | null
  kommune_region: string | null
  kommune_can_edit: boolean
  contact_phone: string | null
  auth_created_at: string
  email_confirmed_at: string | null
  signed_at: string | null
  is_terminated: boolean
  terminated_by_kommune: boolean
  is_operator: boolean
  whitelist_entries: {
    id: string
    email: string
    region: string
    can_edit: boolean
    is_active: boolean
    notes: string | null
  }[]
  listings_count: number
  kommune_grants: OpsKommuneGrant[]
  landlord_kommune_scope: OpsLandlordKommuneScope[]
}

export type OpsServiceArea = {
  id: string
  slug: string
  display_name: string
  status: string
  notes: string | null
  members: {
    kommune_id: string
    slug: string
    display_name: string
    is_primary: boolean
  }[]
}

export type OpsTermsItem = {
  id: string
  title: string
  version: number
  kommune_region: string | null
  scope: string | null
  effective_from: string | null
  created_at: string | null
  pdf_bucket: string | null
  pdf_storage_path: string | null
  approved_for_utleier_signing: boolean
  created_by_name: string | null
}

export type OpsAuditItem = {
  id: string
  user_id: string | null
  action_type: string
  listing_id: string | null
  listing_address: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export type OpsSecuritySnapshot = {
  status: 'ok' | 'warning' | 'critical'
  sign_initiated_last_hour: number
  ops_events_last_24h: number
  warnings: { code: string; severity: string; message: string }[]
}

export async function opsGetDashboardStats(): Promise<OpsDashboardStats> {
  const { data, error } = await supabase.rpc('ops_get_dashboard_stats')
  if (error) throw error
  return data as OpsDashboardStats
}

export async function opsGetTimeSeries(): Promise<OpsTimeSeries> {
  const { data, error } = await supabase.rpc('ops_get_time_series_stats')
  if (error) throw error
  return data as OpsTimeSeries
}

export async function opsSearchUsers(
  query: string | null,
  role: string | null,
  limit = 25,
  offset = 0
) {
  const { data, error } = await supabase.rpc('ops_search_users', {
    p_query: query || null,
    p_role: role || null,
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw error
  return data as { items: OpsUserListItem[]; total: number; limit: number; offset: number }
}

export async function opsGetUserDetail(userId: string): Promise<OpsUserDetail> {
  const { data, error } = await supabase.rpc('ops_get_user_detail', { p_user_id: userId })
  if (error) throw error
  const raw = data as Record<string, unknown>
  return {
    ...(raw as unknown as OpsUserDetail),
    email: String(raw.email_full ?? raw.email ?? ''),
    listings_count: Number(raw.listings_count ?? raw.listing_count ?? 0),
    is_operator: Boolean(raw.is_operator ?? raw.is_platform_operator),
    kommune_grants: (raw.kommune_grants as OpsKommuneGrant[]) ?? [],
    landlord_kommune_scope: (raw.landlord_kommune_scope as OpsLandlordKommuneScope[]) ?? [],
  }
}

export async function opsListPendingTerms(region: string | null, limit = 25, offset = 0) {
  const { data, error } = await supabase.rpc('ops_list_pending_terms', {
    p_region: region || null,
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw error
  return data as { items: OpsTermsItem[]; total: number; limit: number; offset: number }
}

export async function opsListAuditEvents(
  action: string | null,
  since: string | null,
  limit = 50,
  offset = 0
) {
  const { data, error } = await supabase.rpc('ops_list_audit_events', {
    p_action: action || null,
    p_since: since,
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw error
  return data as { items: OpsAuditItem[]; total: number; limit: number; offset: number }
}

export async function opsGetSecuritySnapshot(): Promise<OpsSecuritySnapshot> {
  const { data, error } = await supabase.rpc('ops_get_security_snapshot')
  if (error) throw error
  return data as OpsSecuritySnapshot
}

export async function opsSetUserRole(
  userId: string,
  role: string,
  kommuneRegion: string | null,
  kommuneCanEdit: boolean
) {
  const { data, error } = await supabase.rpc('ops_set_user_role', {
    p_user_id: userId,
    p_role: role,
    p_kommune_region: kommuneRegion,
    p_kommune_can_edit: kommuneCanEdit,
  })
  if (error) throw error
  return data
}

export async function opsManageWhitelist(
  email: string,
  region: string,
  isActive: boolean,
  notes: string | null
) {
  const { data, error } = await supabase.rpc('ops_manage_whitelist', {
    p_email: email,
    p_region: region,
    p_is_active: isActive,
    p_notes: notes,
  })
  if (error) throw error
  return data
}

export async function opsApproveTerms(docId: string, approved: boolean, note: string | null) {
  const { data, error } = await supabase.rpc('ops_approve_terms_document', {
    p_doc_id: docId,
    p_approved: approved,
    p_note: note,
  })
  if (error) throw error
  return data
}

export async function opsGrantOperator(userId: string, notes: string | null) {
  const { data, error } = await supabase.rpc('ops_grant_operator', {
    p_user_id: userId,
    p_notes: notes,
  })
  if (error) throw error
  return data
}

export async function opsRevokeOperator(userId: string) {
  const { data, error } = await supabase.rpc('ops_revoke_operator', { p_user_id: userId })
  if (error) throw error
  return data
}

// === Phase 2: Kommuner & health ===

export type OpsKommuneHealth = {
  health: 'green' | 'amber' | 'red'
  staff_count: number
  admin_count: number
  has_dpo: boolean
  dpo_fallback_only: boolean
  terms_approved: number
  terms_pending: number
  listings_matched: number
  region_match_rate: number
  sign_initiated_7d: number
  sign_completed_7d: number
}

export type OpsKommuneListItem = {
  id: string
  slug: string
  display_name: string
  org_nr: string | null
  status: 'draft' | 'pilot' | 'active' | 'suspended'
  region_keys: string[]
  primary_contact_email: string | null
  launched_at: string | null
  created_at: string
  health_metrics: OpsKommuneHealth
}

export type OpsKommuneDetail = {
  kommune: {
    id: string
    slug: string
    display_name: string
    org_nr: string | null
    status: string
    region_keys: string[]
    primary_contact_email: string | null
    launched_at: string | null
    notes: string | null
    created_at: string
    digital_los_enabled?: boolean
    tourism_enabled?: boolean
  }
  health_metrics: OpsKommuneHealth
  staff: {
    id: string
    full_name: string
    email_masked: string
    role: string
    kommune_region: string | null
    kommune_can_edit: boolean
  }[]
  whitelist: {
    id: string
    email: string
    region: string
    can_edit: boolean
    is_active: boolean
    notes: string | null
    created_at: string
  }[]
  terms: {
    id: string
    title: string
    version: number
    approved_for_utleier_signing: boolean
    created_at: string
  }[]
  dpo: {
    region: string
    dpo_email: string
    dpo_name: string | null
    dpo_phone: string | null
    fallback: boolean
  } | null
  recent_events: {
    id: string
    severity: string
    source: string
    code: string
    message: string
    created_at: string
  }[]
}

export type OpsRegionMismatch = {
  id: string
  address: string | null
  city: string | null
  city_normalized: string
}

export type OpsPlatformEvent = {
  id: string
  severity: string
  source: string
  code: string
  message: string
  user_id: string | null
  kommune_id: string | null
  kommune_name?: string | null
  kommune_slug?: string | null
  created_at: string
}

export type OpsErrorOverview = {
  since: string
  by_code: { code: string; severity: string; count: number }[]
  by_source: { source: string; count: number }[]
  recent: OpsPlatformEvent[]
  funnel: {
    sign_initiated: number
    sign_completed: number
    errors_24h: number
    warnings_24h: number
  }
}

export type OpsKommuneGrowthRow = {
  id: string
  slug: string
  display_name: string
  status: string
  listings: number
  landlords: number
  staff: number
  health_metrics: OpsKommuneHealth
}

export type OpsFunnelStats = {
  users_total: number
  users_confirmed: number
  landlords: number
  listings_total: number
  agreements_signed: number
  sign_initiated_30d: number
  sign_completed_30d: number
}

export async function opsListKommuner(): Promise<OpsKommuneListItem[]> {
  const { data, error } = await supabase.rpc('ops_list_kommuner')
  if (error) throw error
  return (data ?? []) as OpsKommuneListItem[]
}

export async function opsGetKommuneDetail(slug: string): Promise<OpsKommuneDetail> {
  const { data, error } = await supabase.rpc('ops_get_kommune_detail', { p_slug: slug })
  if (error) throw error
  return data as OpsKommuneDetail
}

export async function opsSetKommuneFeatures(
  slug: string,
  features: { digitalLosEnabled?: boolean; tourismEnabled?: boolean }
) {
  const { data, error } = await supabase.rpc('ops_set_kommune_features', {
    p_slug: slug,
    p_digital_los_enabled: features.digitalLosEnabled ?? null,
    p_tourism_enabled: features.tourismEnabled ?? null,
  })
  if (error) throw error
  return data
}

export async function opsUpsertKommune(args: {
  slug: string
  displayName: string
  orgNr?: string | null
  status?: string
  regionKeys?: string[]
  primaryContactEmail?: string | null
  notes?: string | null
}) {
  const { data, error } = await supabase.rpc('ops_upsert_kommune', {
    p_slug: args.slug,
    p_display_name: args.displayName,
    p_org_nr: args.orgNr ?? null,
    p_status: args.status ?? 'draft',
    p_region_keys: args.regionKeys ?? null,
    p_primary_contact_email: args.primaryContactEmail ?? null,
    p_notes: args.notes ?? null,
  })
  if (error) throw error
  return data as { ok: boolean; id: string; slug: string }
}

export async function opsSetKommuneStatus(slug: string, status: string) {
  const { data, error } = await supabase.rpc('ops_set_kommune_status', {
    p_slug: slug,
    p_status: status,
  })
  if (error) throw error
  return data
}

export async function opsBulkWhitelist(kommuneId: string, emails: string[], notes?: string | null) {
  const { data, error } = await supabase.rpc('ops_bulk_whitelist', {
    p_kommune_id: kommuneId,
    p_emails: emails,
    p_notes: notes ?? null,
  })
  if (error) throw error
  return data as { ok: boolean; count: number }
}

export async function opsGetUserGrants(userId: string): Promise<OpsKommuneGrant[]> {
  const { data, error } = await supabase.rpc('ops_get_user_grants', { p_user_id: userId })
  if (error) throw error
  return (data ?? []) as OpsKommuneGrant[]
}

export type OpsGrantInput = {
  kommune_id: string
  grant_role?: 'staff' | 'admin'
  can_edit?: boolean
}

export async function opsSetUserGrants(userId: string, grants: OpsGrantInput[]) {
  const { data, error } = await supabase.rpc('ops_set_user_grants', {
    p_user_id: userId,
    p_grants: grants,
  })
  if (error) throw error
  return data as { ok: boolean }
}

export async function opsListServiceAreas(): Promise<OpsServiceArea[]> {
  const { data, error } = await supabase.rpc('ops_list_service_areas')
  if (error) throw error
  return (data ?? []) as OpsServiceArea[]
}

export async function opsUpsertServiceArea(args: {
  slug: string
  displayName: string
  status?: string
  notes?: string | null
  memberKommuneIds?: string[]
  primaryKommuneId?: string | null
}) {
  const { data, error } = await supabase.rpc('ops_upsert_service_area', {
    p_slug: args.slug,
    p_display_name: args.displayName,
    p_status: args.status ?? 'active',
    p_notes: args.notes ?? null,
    p_member_kommune_ids: args.memberKommuneIds ?? null,
    p_primary_kommune_id: args.primaryKommuneId ?? null,
  })
  if (error) throw error
  return data as { id: string; slug: string }
}

export async function opsBulkInvite(
  kommuneIds: string[],
  emails: string[],
  grantRole: 'staff' | 'admin' = 'staff',
  canEdit = true,
  notes?: string | null
) {
  const { data, error } = await supabase.rpc('ops_bulk_invite', {
    p_kommune_ids: kommuneIds,
    p_emails: emails,
    p_grant_role: grantRole,
    p_can_edit: canEdit,
    p_notes: notes ?? null,
  })
  if (error) throw error
  return data as { ok: boolean; count: number }
}

export async function opsDeactivateWhitelist(whitelistId: string) {
  const { data, error } = await supabase.rpc('ops_deactivate_whitelist', {
    p_whitelist_id: whitelistId,
  })
  if (error) throw error
  return data
}

export async function opsUpsertDpo(
  kommuneId: string,
  dpoEmail: string,
  dpoName?: string | null,
  dpoPhone?: string | null
) {
  const { data, error } = await supabase.rpc('ops_upsert_dpo', {
    p_kommune_id: kommuneId,
    p_dpo_email: dpoEmail,
    p_dpo_name: dpoName ?? null,
    p_dpo_phone: dpoPhone ?? null,
  })
  if (error) throw error
  return data
}

export async function opsRegionMismatchReport(kommuneId: string, limit = 50) {
  const { data, error } = await supabase.rpc('ops_region_mismatch_report', {
    p_kommune_id: kommuneId,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as OpsRegionMismatch[]
}

export async function opsGetErrorOverview(
  since?: string | null,
  kommuneId?: string | null,
  limit = 50
): Promise<OpsErrorOverview> {
  const { data, error } = await supabase.rpc('ops_get_error_overview', {
    p_since: since ?? null,
    p_kommune_id: kommuneId ?? null,
    p_limit: limit,
  })
  if (error) throw error
  return data as OpsErrorOverview
}

export async function opsGetKommuneGrowthStats(): Promise<OpsKommuneGrowthRow[]> {
  const { data, error } = await supabase.rpc('ops_get_kommune_growth_stats')
  if (error) throw error
  return (data ?? []) as OpsKommuneGrowthRow[]
}

export async function opsGetFunnelStats(): Promise<OpsFunnelStats> {
  const { data, error } = await supabase.rpc('ops_get_funnel_stats')
  if (error) throw error
  return data as OpsFunnelStats
}

export type OpsPlatformSettingsPayload = {
  social_module_enabled?: boolean
  finn_portal_enabled: boolean
  los_portal_enabled: boolean
  central_events_enabled: boolean
  tourism_lane_enabled: boolean
  stripe_bookings_enabled: boolean
  updated_at?: string | null
  /** Legacy DB before social_module_enabled migration */
  product_mode?: string
}

type PlatformSettingsInput = {
  socialModuleEnabled?: boolean
  finnPortalEnabled?: boolean
  losPortalEnabled?: boolean
  centralEventsEnabled?: boolean
  tourismLaneEnabled?: boolean
  stripeBookingsEnabled?: boolean
}

type PlatformSettingsRpcResult = { ok: boolean; settings: OpsPlatformSettingsPayload }

function isMissingPlatformRpc(error: { code?: string; message?: string }): boolean {
  const msg = error.message ?? ''
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    /Could not find the function|function.*does not exist|schema cache/i.test(msg)
  )
}

function isMissingSocialColumn(error: { code?: string; message?: string }): boolean {
  const msg = error.message ?? ''
  return error.code === '42703' || /social_module_enabled/i.test(msg)
}

export function normalizeOpsPlatformSettingsPayload(
  raw: OpsPlatformSettingsPayload
): OpsPlatformSettingsPayload {
  const social =
    raw.social_module_enabled !== undefined
      ? raw.social_module_enabled !== false
      : raw.product_mode !== 'boly'
  return {
    social_module_enabled: social,
    finn_portal_enabled: Boolean(raw.finn_portal_enabled),
    los_portal_enabled: Boolean(raw.los_portal_enabled),
    central_events_enabled: Boolean(raw.central_events_enabled),
    tourism_lane_enabled: Boolean(raw.tourism_lane_enabled),
    stripe_bookings_enabled: Boolean(raw.stripe_bookings_enabled),
    updated_at: raw.updated_at ?? null,
  }
}

function legacyProductMode(input: Required<PlatformSettingsInput>): 'boly' | 'hjerterum' {
  if (
    input.tourismLaneEnabled ||
    input.losPortalEnabled ||
    input.centralEventsEnabled ||
    input.finnPortalEnabled
  ) {
    return 'hjerterum'
  }
  return 'boly'
}

async function opsSetPlatformSettingsLegacy(
  input: PlatformSettingsInput
): Promise<PlatformSettingsRpcResult> {
  const full: Required<PlatformSettingsInput> = {
    socialModuleEnabled: input.socialModuleEnabled ?? true,
    finnPortalEnabled: input.finnPortalEnabled ?? false,
    losPortalEnabled: input.losPortalEnabled ?? false,
    centralEventsEnabled: input.centralEventsEnabled ?? false,
    tourismLaneEnabled: input.tourismLaneEnabled ?? false,
    stripeBookingsEnabled: input.stripeBookingsEnabled ?? false,
  }

  const { data, error } = await supabase.rpc('ops_set_platform_settings', {
    p_product_mode: legacyProductMode(full),
    p_finn_portal_enabled: full.finnPortalEnabled,
    p_los_portal_enabled: full.losPortalEnabled,
    p_central_events_enabled: full.centralEventsEnabled,
    p_tourism_lane_enabled: full.tourismLaneEnabled,
    p_stripe_bookings_enabled: full.stripeBookingsEnabled,
  })
  if (error) throw error
  const payload = data as PlatformSettingsRpcResult
  return {
    ok: payload.ok,
    settings: normalizeOpsPlatformSettingsPayload(payload.settings),
  }
}

export async function opsGetPlatformSettings(): Promise<OpsPlatformSettingsPayload> {
  const { data, error } = await supabase.rpc('ops_get_platform_settings')
  if (error) throw error
  return normalizeOpsPlatformSettingsPayload(data as OpsPlatformSettingsPayload)
}

export async function opsSetPlatformSettings(input: PlatformSettingsInput) {
  const { data, error } = await supabase.rpc('ops_set_platform_settings', {
    p_social_module_enabled: input.socialModuleEnabled ?? null,
    p_finn_portal_enabled: input.finnPortalEnabled ?? null,
    p_los_portal_enabled: input.losPortalEnabled ?? null,
    p_central_events_enabled: input.centralEventsEnabled ?? null,
    p_tourism_lane_enabled: input.tourismLaneEnabled ?? null,
    p_stripe_bookings_enabled: input.stripeBookingsEnabled ?? null,
  })

  if (error) {
    if (isMissingSocialColumn(error)) {
      throw new Error(
        'Database migration missing (social_module_enabled). Run: supabase db push'
      )
    }
    if (isMissingPlatformRpc(error)) {
      return opsSetPlatformSettingsLegacy(input)
    }
    throw error
  }

  const payload = data as PlatformSettingsRpcResult
  return {
    ok: payload.ok,
    settings: normalizeOpsPlatformSettingsPayload(payload.settings),
  }
}

// ─── Broadcasts ───

export type BroadcastSegment = {
  roles?: string[]
  kommune_ids?: string[]
  event_id?: string
  service_area_id?: string
  listing_kommune_slugs?: string[]
  user_ids?: string[]
  require_active_kommune?: boolean
  exclude_user_ids?: string[]
}

export type BroadcastChannels = {
  in_app: boolean
  push: boolean
  email: boolean
}

export type BroadcastPreview = {
  total: number
  push_eligible: number
  email_eligible: number
  by_role: Record<string, number>
  by_locale: Record<string, number>
}

export type BroadcastListItem = {
  id: string
  status: string
  created_at: string
  sent_at: string | null
  created_by: string
  recipient_count: number
  delivery_stats: Record<string, unknown>
  title_no: string
  segment: BroadcastSegment
  message_preview: string
}

export type BroadcastDetail = {
  id: string
  status: string
  created_at: string
  sent_at: string | null
  created_by: string
  segment: BroadcastSegment
  title_no: string
  title_se: string
  title_en: string
  message_no: string
  message_se: string
  message_en: string
  link_href: string | null
  channels: BroadcastChannels
  recipient_count: number
  delivery_stats: Record<string, unknown>
}

export async function opsPreviewBroadcast(segment: BroadcastSegment): Promise<BroadcastPreview> {
  const { data, error } = await supabase.rpc('ops_preview_broadcast', { p_segment: segment })
  if (error) throw error
  return data as BroadcastPreview
}

export async function opsUpsertBroadcastDraft(input: {
  id?: string | null
  segment: BroadcastSegment
  titleNo: string
  titleSe?: string
  titleEn?: string
  messageNo: string
  messageSe?: string
  messageEn?: string
  linkHref?: string | null
  channels?: BroadcastChannels
}) {
  const { data, error } = await supabase.rpc('ops_upsert_broadcast_draft', {
    p_id: input.id ?? null,
    p_segment: input.segment,
    p_title_no: input.titleNo,
    p_title_se: input.titleSe ?? '',
    p_title_en: input.titleEn ?? '',
    p_message_no: input.messageNo,
    p_message_se: input.messageSe ?? '',
    p_message_en: input.messageEn ?? '',
    p_link_href: input.linkHref ?? null,
    p_channels: input.channels ?? { in_app: true, push: true, email: false },
  })
  if (error) throw error
  return data as { ok: boolean; id: string }
}

export async function opsSendBroadcast(broadcastId: string) {
  const { data, error } = await supabase.rpc('ops_send_broadcast', {
    p_broadcast_id: broadcastId,
  })
  if (error) throw error
  return data as { ok: boolean; broadcast_id: string; recipient_count: number; delivery_stats: Record<string, unknown> }
}

export async function opsListBroadcasts(limit = 50, offset = 0) {
  const { data, error } = await supabase.rpc('ops_list_broadcasts', {
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw error
  const payload = data as { items: BroadcastListItem[]; total: number }
  return payload
}

export async function opsGetBroadcast(id: string): Promise<BroadcastDetail> {
  const { data, error } = await supabase.rpc('ops_get_broadcast', { p_id: id })
  if (error) throw error
  return data as BroadcastDetail
}

export async function opsApplyPlatformPreset(
  preset: 'boly_only' | 'hjerterum_full' | 'hjerterum_pilot'
) {
  const { data, error } = await supabase.rpc('ops_apply_platform_preset', {
    p_preset: preset,
  })
  if (error) {
    if (isMissingPlatformRpc(error) || isMissingSocialColumn(error)) {
      const map: Record<typeof preset, PlatformSettingsInput> = {
        boly_only: {
          socialModuleEnabled: true,
          finnPortalEnabled: false,
          losPortalEnabled: false,
          centralEventsEnabled: false,
          tourismLaneEnabled: false,
          stripeBookingsEnabled: false,
        },
        hjerterum_full: {
          socialModuleEnabled: true,
          finnPortalEnabled: true,
          losPortalEnabled: true,
          centralEventsEnabled: true,
          tourismLaneEnabled: true,
          stripeBookingsEnabled: true,
        },
        hjerterum_pilot: {
          socialModuleEnabled: true,
          finnPortalEnabled: false,
          losPortalEnabled: true,
          centralEventsEnabled: false,
          tourismLaneEnabled: true,
          stripeBookingsEnabled: false,
        },
      }
      return opsSetPlatformSettingsLegacy(map[preset])
    }
    throw error
  }
  const payload = data as PlatformSettingsRpcResult
  return {
    ok: payload.ok,
    settings: normalizeOpsPlatformSettingsPayload(payload.settings),
  }
}
