'use client'

import { useState } from 'react'
import type { User as AuthUser } from '@supabase/supabase-js'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import {
  listingRowFieldsForAvailabilityToday,
  formidlaPeriodIdsOverlappingToday,
} from '@/app/lib/listingAvailabilityStatusToday'
import {
  appendMediationNoteToOwnerMessage,
} from '@/app/lib/formidletNotification'
import { notifyLandlordInvoiceBasisIfKonto } from '@/app/lib/invoiceBasisNotify'
import type { ListingAvailabilityRow, ListingDetailsRecord, MediationReservationRow } from '@/app/lib/listingUiTypes'
import { listingDetailsErrMessage as errMessage } from '@/features/listings/lib/listingDetailsUtils'
import type { TranslationKey } from '@/lib/translations'

type ConfirmFn = (opts: {
  title: string
  message?: string
  variant?: 'danger' | 'primary'
}) => Promise<boolean>

type ToastFn = (message: string, variant?: 'success' | 'error') => void

type UseListingMediationOptions = {
  id: string
  listing: ListingDetailsRecord | null
  availability: ListingAvailabilityRow[]
  setListing: React.Dispatch<React.SetStateAction<ListingDetailsRecord | null>>
  setAvailability: React.Dispatch<React.SetStateAction<ListingAvailabilityRow[]>>
  isNavView: boolean
  kommuneCanEdit: boolean
  ownerAgreementTerminated: boolean
  currentUser: AuthUser | null
  mediationReservation: MediationReservationRow | null
  loadMediationReservation: () => Promise<void>
  confirmDialog: ConfirmFn
  toast: ToastFn
  t: (key: TranslationKey) => string
}

export function useListingMediation({
  id,
  listing,
  availability,
  setListing,
  setAvailability,
  isNavView,
  kommuneCanEdit,
  ownerAgreementTerminated,
  currentUser,
  mediationReservation,
  loadMediationReservation,
  confirmDialog,
  toast,
  t,
}: UseListingMediationOptions) {
  const [formidletStart, setFormidletStart] = useState('')
  const [formidletEnd, setFormidletEnd] = useState('')
  const [formidletSending, setFormidletSending] = useState(false)
  const [formidletMediationNote, setFormidletMediationNote] = useState('')
  const [formidletIncludeNoteInNotification, setFormidletIncludeNoteInNotification] =
    useState(false)
  const [reservationNote, setReservationNote] = useState('')
  const [reservationLoading, setReservationLoading] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [pendingDeletePeriod, setPendingDeletePeriod] = useState<ListingAvailabilityRow | null>(
    null
  )

  const getStatusForDate = (date: Date) => {
    const ymd = (d: Date) => d.toISOString().slice(0, 10)
    const day = ymd(date)
    const hits = availability.filter((p) => day >= p.start_date && day <= p.end_date)
    if (hits.length === 0) return null
    if (hits.some((h) => h.status === 'Formidla')) return 'Formidla'
    if (hits.length > 1) {
      const statuses = new Set(hits.map((h) => h.status))
      if (statuses.size > 1) return 'Konflikt'
    }
    if (hits.some((h) => h.status === 'Utilgjengelig')) return 'Utilgjengelig'
    return hits[0]?.status ?? null
  }

  const handleReserveMediation = async () => {
    if (!listing || !isNavView || !kommuneCanEdit) return
    if (ownerAgreementTerminated) {
      toast(t('expiredOwnerNoMediationNav'), 'error')
      return
    }
    setReservationLoading(true)
    try {
      const { error } = await supabase.rpc('reserve_listing_mediation', {
        p_listing_id: id,
        p_note: reservationNote.trim() || null,
      })
      if (error) throw error
      await loadMediationReservation()
      setReservationNote('')
    } catch (e: unknown) {
      const m = errMessage(e)
      toast(t('mediationReserveError') + (m ? `: ${m}` : ''), 'error')
    } finally {
      setReservationLoading(false)
    }
  }

  const handleReleaseMediation = async () => {
    if (!listing || !isNavView) return
    if (ownerAgreementTerminated) {
      toast(t('expiredOwnerNoMediationNav'), 'error')
      return
    }
    setReservationLoading(true)
    try {
      const { error } = await supabase.rpc('release_listing_mediation', { p_listing_id: id })
      if (error) throw error
      await loadMediationReservation()
    } catch (e: unknown) {
      const m = errMessage(e)
      toast(t('mediationReserveError') + (m ? `: ${m}` : ''), 'error')
    } finally {
      setReservationLoading(false)
    }
  }

  const handleAddFormidletPeriod = async () => {
    if (!listing || !isNavView) return
    if (ownerAgreementTerminated) {
      toast(t('expiredOwnerNoMediationNav'), 'error')
      return
    }
    if (!formidletStart || !formidletEnd) {
      toast(t('selectStartEndFormidling'), 'error')
      return
    }
    if (mediationReservation && mediationReservation.reserved_by !== currentUser?.id) {
      toast(t('mediationBlockedFormidlet'), 'error')
      return
    }
    if (new Date(formidletEnd) < new Date(formidletStart)) {
      toast(t('endDateAfterStart'), 'error')
      return
    }
    const start = formidletStart
    const end = formidletEnd
    const savedNote = formidletMediationNote
    const savedInclude = formidletIncludeNoteInNotification
    const noteTrimmed = formidletMediationNote.trim()
    const includeNote = !!(formidletIncludeNoteInNotification && noteTrimmed)
    setFormidletSending(true)
    const newPeriod = {
      id: crypto.randomUUID(),
      listing_id: id,
      start_date: start,
      end_date: end,
      status: 'Formidla',
      mediation_note: noteTrimmed || null,
      include_note_in_owner_notification: includeNote,
    }
    setAvailability((prev) => {
      const next = [...prev, newPeriod].sort((a, b) => (a.start_date > b.start_date ? 1 : -1))
      const sync = listingRowFieldsForAvailabilityToday(String(id), { [String(id)]: next })
      setListing((L) => (L ? { ...L, ...sync } : L))
      return next
    })
    setFormidletStart('')
    setFormidletEnd('')
    setFormidletMediationNote('')
    setFormidletIncludeNoteInNotification(false)
    try {
      const { error: availError } = await supabase.from('listing_availability').insert([
        {
          listing_id: id,
          start_date: start,
          end_date: end,
          status: 'Formidla',
          mediation_note: noteTrimmed || null,
          include_note_in_owner_notification: includeNote,
        },
      ])
      if (availError) throw availError
      const { data: availData } = await supabase
        .from('listing_availability')
        .select('*')
        .eq('listing_id', id)
        .order('start_date')
      const rows = availData ?? []
      setAvailability(rows)
      const rowSync = listingRowFieldsForAvailabilityToday(String(id), { [String(id)]: rows })
      const { error } = await supabase.from('listings').update(rowSync).eq('id', id)
      if (error) throw error
      setListing((L) => (L ? { ...L, ...rowSync } : L))
      const user = await getAuthUserDeduped()
      if (listing?.owner_id) {
        await supabase.from('audit_logs').insert([
          {
            user_id: listing.owner_id,
            listing_id: id,
            action_type: 'KOMMUNE_MARK_FORMIDLA',
            listing_address: listing.address,
            details: {
              performed_by_user_id: user?.id,
              start_date: start,
              end_date: end,
              include_note_in_owner_notification: includeNote,
              has_mediation_note: !!noteTrimmed,
            },
          },
        ])
      }
      if (listing?.owner_id) {
        await supabase
          .from('listing_tenant_tokens')
          .upsert([{ listing_id: id }], { onConflict: 'listing_id' })
        const baseMsg = `Boligen din i ${listing.address} er markert som formidlet for perioden ${start}–${end}. Lever overtakelsesrapport ved overtakelse – klikk for å åpne skjema.`
        const message = appendMediationNoteToOwnerMessage(baseMsg, noteTrimmed, includeNote)
        await supabase.from('notifications').insert([
          {
            owner_id: listing.owner_id,
            type: 'HOUSE_FORMIDLET',
            title: 'Bolig formidlet',
            message,
            listing_id: id,
          },
        ])
        await notifyLandlordInvoiceBasisIfKonto(supabase, {
          ownerId: listing.owner_id,
          listingId: String(id),
          address: listing.address ?? '',
          paymentMethod: listing.payment_method,
        })
      }
    } catch (rollbackErr: unknown) {
      setListing({ ...listing, status: listing.status, is_available: listing.is_available })
      setAvailability(availability)
      setFormidletStart(start)
      setFormidletEnd(end)
      setFormidletMediationNote(savedNote)
      setFormidletIncludeNoteInNotification(savedInclude)
      toast(t('errorPrefix') + errMessage(rollbackErr), 'error')
    } finally {
      setFormidletSending(false)
    }
  }

  const handleRemovePeriod = async (period: ListingAvailabilityRow) => {
    if (isNavView && ownerAgreementTerminated) {
      toast(t('expiredOwnerNoMediationNav'), 'error')
      return
    }
    const prevAvailability = [...availability]
    const nextAvailAfterDelete = prevAvailability.filter((x) => x.id !== period.id)
    setAvailability(nextAvailAfterDelete)
    setPendingDeletePeriod(null)
    try {
      const { error } = await supabase.from('listing_availability').delete().eq('id', period.id)
      if (error) throw error
      const rowSync = listingRowFieldsForAvailabilityToday(String(id), {
        [String(id)]: nextAvailAfterDelete,
      })
      if (listing) {
        setListing({ ...listing, ...rowSync })
        await supabase.from('listings').update(rowSync).eq('id', id)
      }
    } catch (err: unknown) {
      setAvailability(prevAvailability)
      toast(t('errorPrefix') + errMessage(err), 'error')
    }
  }

  const handleRemoveFormidlet = async () => {
    if (!listing || !isNavView) return
    if (ownerAgreementTerminated) {
      toast(t('expiredOwnerNoMediationNav'), 'error')
      return
    }
    if (
      !(await confirmDialog({
        title: t('dbTitleRemoveMediation'),
        message: t('dbRemoveFormidletConfirm').replace('{address}', listing.address ?? ''),
        variant: 'danger',
      }))
    )
      return
    const prevListing = listing
    const prevAvailability = availability
    const periodIds = formidlaPeriodIdsOverlappingToday(String(id), { [String(id)]: availability })
    const nextAvail =
      periodIds.length > 0
        ? availability.filter((p) => !periodIds.includes(String(p.id)))
        : availability
    const rowSync = listingRowFieldsForAvailabilityToday(String(id), { [String(id)]: nextAvail })
    setListing({ ...listing, ...rowSync })
    setAvailability(nextAvail)
    try {
      if (periodIds.length > 0) {
        const { error: delError } = await supabase
          .from('listing_availability')
          .delete()
          .in('id', periodIds)
        if (delError) throw delError
      }
      const { error } = await supabase.from('listings').update(rowSync).eq('id', id)
      if (error) throw error
      const user = await getAuthUserDeduped()
      if (listing?.owner_id) {
        await supabase.from('audit_logs').insert([
          {
            user_id: listing.owner_id,
            listing_id: id,
            action_type: 'KOMMUNE_REMOVE_FORMIDLA',
            listing_address: listing.address,
            details: { performed_by_user_id: user?.id },
          },
        ])
      }
    } catch (err: unknown) {
      setListing(prevListing)
      setAvailability(prevAvailability)
      toast(t('errorPrefix') + errMessage(err), 'error')
    }
  }

  return {
    formidletStart,
    setFormidletStart,
    formidletEnd,
    setFormidletEnd,
    formidletSending,
    formidletMediationNote,
    setFormidletMediationNote,
    formidletIncludeNoteInNotification,
    setFormidletIncludeNoteInNotification,
    reservationNote,
    setReservationNote,
    reservationLoading,
    calendarMonth,
    setCalendarMonth,
    pendingDeletePeriod,
    setPendingDeletePeriod,
    getStatusForDate,
    handleReserveMediation,
    handleReleaseMediation,
    handleAddFormidletPeriod,
    handleRemovePeriod,
    handleRemoveFormidlet,
  }
}
