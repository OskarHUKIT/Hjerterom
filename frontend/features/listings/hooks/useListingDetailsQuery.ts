'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { User as AuthUser } from '@supabase/supabase-js'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import { devWarn, logError } from '@/app/lib/appLogger'
import { useToast } from '@/app/components/design-system'
import { useLanguage } from '@/context/LanguageContext'
import { isKommuneStaffRole } from '@/app/lib/kommuneRoles'
import { isEventStaffRole } from '@/app/lib/eventStaffRoles'
import type {
  HandoverReportRow,
  ListingAvailabilityRow,
  ListingDetailsRecord,
  MediationReservationRow,
  NavNoteRow,
} from '@/app/lib/listingUiTypes'
import {
  listingHasFormidlaPeriod,
  listingDetailsErrMessage as errMessage,
} from '@/features/listings/lib/listingDetailsUtils'

type UseListingDetailsQueryOptions = {
  id: string
  isNavView: boolean
  router: AppRouterInstance
}

export function useListingDetailsQuery({ id, isNavView, router }: UseListingDetailsQueryOptions) {
  const { t } = useLanguage()
  const toast = useToast()

  const [listing, setListing] = useState<ListingDetailsRecord | null>(null)
  const [availability, setAvailability] = useState<ListingAvailabilityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [navNotes, setNavNotes] = useState<NavNoteRow[]>([])
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [handoverReports, setHandoverReports] = useState<HandoverReportRow[]>([])
  const [hasActiveAgreement, setHasActiveAgreement] = useState(false)
  const [regionAccessDenied, setRegionAccessDenied] = useState(false)
  const [kommuneCanEdit, setKommuneCanEdit] = useState(false)
  const [viewerIsKommuneStaff, setViewerIsKommuneStaff] = useState(false)
  const [viewerIsEventStaff, setViewerIsEventStaff] = useState(false)
  const [viewerRole, setViewerRole] = useState<string | null>(null)
  const [ownerAgreementTerminated, setOwnerAgreementTerminated] = useState(false)
  const [tenantReportToken, setTenantReportToken] = useState<string | null>(null)
  const [mediationReservation, setMediationReservation] = useState<MediationReservationRow | null>(
    null
  )

  const loadMediationReservation = useCallback(async () => {
    if (!id || !isNavView) return
    await supabase.rpc('expire_stale_mediation_reservations')
    const { data: resRow } = await supabase
      .from('listing_mediation_reservations')
      .select('*')
      .eq('listing_id', id)
      .eq('status', 'active')
      .maybeSingle()
    if (!resRow) {
      setMediationReservation(null)
      return
    }
    const { data: n } = await supabase.rpc('get_user_display_name', {
      p_user_id: resRow.reserved_by,
    })
    setMediationReservation({
      ...resRow,
      reserved_by_name: typeof n === 'string' ? n : '…',
    })
  }, [id, isNavView])

  useEffect(() => {
    setRegionAccessDenied(false)
    async function fetchData() {
      setOwnerAgreementTerminated(false)
      try {
        const user = await getAuthUserDeduped()
        setCurrentUser(user)

        let navViewerRole: string | null = null

        if (user) {
          if (isNavView) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role, kommune_can_edit')
              .eq('id', user.id)
              .maybeSingle()
            const role = user.user_metadata?.role || profile?.role
            navViewerRole = role ?? null
            setViewerRole(role ?? null)
            const isKommune = isKommuneStaffRole(role)
            const isEvent = isEventStaffRole(role)
            setViewerIsKommuneStaff(isKommune)
            setViewerIsEventStaff(isEvent)
            setKommuneCanEdit(
              isEvent
                ? true
                : profile?.role === 'kommune_admin' || profile?.kommune_can_edit !== false
            )
            if (!isKommune && !isEvent) {
              router.push(`/listings/${id}?view=owner`)
              return
            }
          } else {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .maybeSingle()
            const role = user.user_metadata?.role || profile?.role
            setViewerRole(role ?? null)
            setViewerIsKommuneStaff(isKommuneStaffRole(role))
          }
        } else {
          setViewerIsKommuneStaff(false)
          setViewerRole(null)
        }

        const listingPromise =
          isNavView && user
            ? isEventStaffRole(navViewerRole)
              ? supabase.rpc('get_listing_by_id_for_event_staff', { p_listing_id: id })
              : supabase.rpc('get_listing_by_id_for_kommune', { p_listing_id: id })
            : supabase.from('listings').select('*').eq('id', id).single()

        const agreementPromise = user
          ? supabase
              .from('user_agreements')
              .select('*')
              .eq('user_id', user.id)
              .eq('is_terminated', false)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null })

        const [listingRes, agreementRes] = await Promise.all([listingPromise, agreementPromise])

        let data: ListingDetailsRecord | null = null
        let error: { message?: string } | null = null
        if (isNavView && user) {
          error = listingRes.error
          const rows = (listingRes.data as ListingDetailsRecord[] | null) || []
          data = rows[0] ?? null
        } else {
          data = (listingRes.data as ListingDetailsRecord | null) ?? null
          error = listingRes.error
        }
        if (error) throw error
        setHasActiveAgreement(!!agreementRes.data)
        setListing(data)

        if (isNavView && user && !data) {
          setRegionAccessDenied(true)
        }

        const ownerId = data?.owner_id
        const ownerTermPromise = ownerId
          ? supabase
              .from('user_agreements')
              .select('id')
              .eq('user_id', ownerId)
              .eq('is_terminated', true)
              .maybeSingle()
          : Promise.resolve({ data: null })

        const availabilityPromise = supabase
          .from('listing_availability')
          .select('*')
          .eq('listing_id', id)
          .order('start_date', { ascending: true })

        const reportsPromise = supabase
          .from('handover_reports')
          .select('*')
          .eq('listing_id', id)
          .order('created_at', { ascending: false })

        const notesPromise =
          user && isNavView
            ? supabase
                .from('nav_notes')
                .select('*')
                .eq('listing_id', id)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: null })

        const [ownerTermRes, availRes, reportsRes, notesRes] = await Promise.all([
          ownerTermPromise,
          availabilityPromise,
          reportsPromise,
          notesPromise,
        ])

        const ownerTerm = !!ownerTermRes.data
        setOwnerAgreementTerminated(ownerTerm)
        const availData = availRes.data || []
        setAvailability(availData)
        setHandoverReports((reportsRes.data as HandoverReportRow[] | null) || [])

        if (user && isNavView) {
          setNavNotes((notesRes.data as NavNoteRow[] | null) || [])
          if (!ownerTerm) await loadMediationReservation()
          else setMediationReservation(null)
        }

        const isFormidlet =
          data?.status === 'Formidla' ||
          listingHasFormidlaPeriod(availData as { status?: string }[] | null | undefined)
        if (user && isNavView && isFormidlet && !ownerTerm) {
          let tokenData = await supabase
            .from('listing_tenant_tokens')
            .select('token')
            .eq('listing_id', id)
            .maybeSingle()
          if (tokenData.error)
            devWarn('[listing_tenant_tokens] select:', tokenData.error.message)
          if (!tokenData.data?.token) {
            const up = await supabase
              .from('listing_tenant_tokens')
              .upsert([{ listing_id: id }], { onConflict: 'listing_id' })
            if (up.error) devWarn('[listing_tenant_tokens] upsert:', up.error.message)
            tokenData = await supabase
              .from('listing_tenant_tokens')
              .select('token')
              .eq('listing_id', id)
              .maybeSingle()
          }
          setTenantReportToken(tokenData.data?.token || null)
        } else {
          setTenantReportToken(null)
        }
      } catch (err) {
        logError('Error fetching listing:', err)
        toast(t('errorPrefix') + errMessage(err), 'error')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchData()
  }, [id, isNavView, loadMediationReservation, router, t, toast])

  return {
    listing,
    setListing,
    availability,
    setAvailability,
    loading,
    navNotes,
    setNavNotes,
    currentUser,
    handoverReports,
    setHandoverReports,
    hasActiveAgreement,
    regionAccessDenied,
    kommuneCanEdit,
    viewerIsKommuneStaff,
    viewerIsEventStaff,
    viewerRole,
    ownerAgreementTerminated,
    tenantReportToken,
    setTenantReportToken,
    mediationReservation,
    loadMediationReservation,
  }
}
