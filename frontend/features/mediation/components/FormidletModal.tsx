'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import type { ListingAvailabilityRow, NavDatabaseListingRow } from '@/app/lib/listingUiTypes'
import { useLanguage } from '@/context/LanguageContext'
import { formatDateNo } from '@/app/lib/dateFormat'
import { DateInput } from '@/app/components/DateInput'
import {
  appendMediationNoteToOwnerMessage,
  MAX_MEDIATION_NOTE_IN_NOTIFICATION,
} from '@/app/lib/formidletNotification'
import { notifyLandlordInvoiceBasisIfKonto } from '@/app/lib/invoiceBasisNotify'
import { listingRowFieldsForAvailabilityToday } from '@/app/lib/listingAvailabilityStatusToday'
import { supabaseErrorMessage } from '@/app/lib/supabaseErrorMessage'
import { dayAvailabilityToneForIso } from '@/app/lib/listingDayAvailabilityTone'
import { useToast, useConfirm } from '@/app/components/design-system'

export type FormidletModalProps = {
  listing: NavDatabaseListingRow | null
  availability: Record<string, ListingAvailabilityRow[]>
  isEventPortal: boolean
  eventFilterId: string
  onClose: () => void
  onSuccess: () => void
}

export default function FormidletModal({
  listing,
  availability,
  isEventPortal,
  eventFilterId,
  onClose,
  onSuccess,
}: FormidletModalProps) {
  const { t } = useLanguage()
  const toast = useToast()
  const confirmDialog = useConfirm()

  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [mediationNote, setMediationNote] = useState('')
  const [includeNoteInOwnerNotif, setIncludeNoteInOwnerNotif] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!listing) return
    const today = new Date().toISOString().slice(0, 10)
    setStart(today)
    setEnd(today)
    setMediationNote('')
    setIncludeNoteInOwnerNotif(false)
  }, [listing?.id])

  const close = () => {
    if (sending) return
    onClose()
  }

  const resolveEventIdForListing = async (listingId: string): Promise<string | null> => {
    if (!isEventPortal) return null
    if (eventFilterId !== 'Alle') return eventFilterId
    const { data: staffRows } = await supabase
      .from('central_event_staff')
      .select('event_id')
      .eq('profile_id', (await getAuthUserDeduped())?.id ?? '')
    const eventIds = (staffRows ?? []).map((r) => r.event_id)
    if (eventIds.length === 0) return null
    const { data: optIn } = await supabase
      .from('listing_event_availability')
      .select('event_id')
      .eq('listing_id', listingId)
      .eq('status', 'active')
      .in('event_id', eventIds)
      .limit(1)
      .maybeSingle()
    return optIn?.event_id ?? eventIds[0] ?? null
  }

  const handleMarkAsFormidlet = async () => {
    if (!listing || !start || !end) {
      toast(t('dbSelectStartEnd'), 'error')
      return
    }
    if (new Date(end) < new Date(start)) {
      toast(t('endDateAfterStart'), 'error')
      return
    }
    const id = listing.id
    const address = String(listing.address ?? '')
    if (listing?.owner_id) {
      const { data: ownerTerm } = await supabase
        .from('user_agreements')
        .select('id')
        .eq('user_id', listing.owner_id)
        .eq('is_terminated', true)
        .maybeSingle()
      if (ownerTerm) {
        toast(t('expiredOwnerNoMediationNav'), 'error')
        return
      }
    }
    const noteTrimmed = mediationNote.trim()
    const includeNote = !!(includeNoteInOwnerNotif && noteTrimmed)
    const attachSchema = await confirmDialog({
      title: t('dbTitleAddFormidletPeriod'),
      message: t('dbMarkFormidletConfirm')
        .replace('{address}', address)
        .replace('{start}', formatDateNo(start))
        .replace('{end}', formatDateNo(end)),
    })
    if (!attachSchema) return

    setSending(true)
    try {
      const eventIdForPeriod = isEventPortal ? await resolveEventIdForListing(id) : null
      const { data: insertedPeriod, error: availError } = await supabase
        .from('listing_availability')
        .insert([
          {
            listing_id: id,
            start_date: start,
            end_date: end,
            status: 'Formidla',
            mediation_note: noteTrimmed || null,
            include_note_in_owner_notification: includeNote,
            lane: isEventPortal ? 'turisme' : 'sosial',
            event_id: eventIdForPeriod,
          },
        ])
        .select()
        .single()

      if (availError) throw availError
      if (!insertedPeriod) throw new Error('listing_availability insert returned no row')

      const mergedAvail = [...(availability[id] || []), insertedPeriod as ListingAvailabilityRow]
      const rowSync = listingRowFieldsForAvailabilityToday(id, { ...availability, [id]: mergedAvail })
      const { error } = await supabase.from('listings').update(rowSync).eq('id', id)

      if (error) throw error

      const user = await getAuthUserDeduped()
      if (listing?.owner_id) {
        await supabase.from('audit_logs').insert([
          {
            user_id: listing.owner_id,
            listing_id: id,
            action_type: isEventPortal ? 'EVENT_MARK_FORMIDLA' : 'KOMMUNE_MARK_FORMIDLA',
            listing_address: address,
            details: {
              performed_by_user_id: user?.id,
              by: isEventPortal ? 'Event-saksbehandler' : 'Kommune-ansatt',
              event_id: eventIdForPeriod,
              attached_schema: attachSchema,
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
        const baseMsg = isEventPortal
          ? `Event-saksbehandler har markert boligen din i ${address} som formidlet for perioden ${formatDateNo(start)}–${formatDateNo(end)}. Lever overtakelsesrapport ved overtakelse – klikk for å åpne skjema.`
          : `Kommunen har markert boligen din i ${address} som formidlet for perioden ${formatDateNo(start)}–${formatDateNo(end)}. Lever overtakelsesrapport ved overtakelse – klikk for å åpne skjema.`
        const message = appendMediationNoteToOwnerMessage(baseMsg, noteTrimmed, includeNote)
        await supabase.from('notifications').insert([
          {
            owner_id: listing.owner_id,
            type: 'HOUSE_FORMIDLET',
            title: isEventPortal ? 'Bolig formidlet (arrangement)' : 'Bolig formidlet',
            message,
            listing_id: id,
          },
        ])
        await notifyLandlordInvoiceBasisIfKonto(supabase, {
          ownerId: listing.owner_id,
          listingId: id,
          address,
          paymentMethod: listing.payment_method as string | null | undefined,
        })
      }

      onClose()
      onSuccess()
    } catch (err: unknown) {
      toast(t('errorPrefix') + supabaseErrorMessage(err), 'error')
    } finally {
      setSending(false)
    }
  }

  if (!listing) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={() => close()}
    >
      <div
        className="card"
        style={{ padding: 'var(--space-8)', maxWidth: '420px', width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-6)',
          }}
        >
          <h3 style={{ margin: 0 }}>{t('dbModalAddFormidletTitle')}</h3>
          <button
            type="button"
            onClick={() => close()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>
        <p
          style={{
            marginBottom: 'var(--space-4)',
            fontSize: '0.95rem',
            color: 'var(--text-muted)',
          }}
        >
          {listing.address}
        </p>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <label className="label">{t('periodDateRange')}</label>
          <div className="formidlet-date-range" style={{ marginTop: 'var(--space-2)' }}>
            <div>
              <span
                className="text-sm"
                style={{ display: 'block', marginBottom: '4px', opacity: 0.8 }}
              >
                {t('from')}
              </span>
              <DateInput
                showCalendar
                className="input"
                style={{ marginBottom: 0, width: '100%' }}
                value={start}
                onChange={setStart}
                max={end || undefined}
                placeholder={t('dateInputPlaceholder')}
                calendarDayTone={(iso) =>
                  dayAvailabilityToneForIso(iso, availability[listing.id] ?? [])
                }
              />
            </div>
            <div>
              <span
                className="text-sm"
                style={{ display: 'block', marginBottom: '4px', opacity: 0.8 }}
              >
                {t('to')}
              </span>
              <DateInput
                showCalendar
                className="input"
                style={{ marginBottom: 0, width: '100%' }}
                value={end}
                onChange={setEnd}
                min={start || undefined}
                placeholder={t('dateInputPlaceholder')}
                calendarDayTone={(iso) =>
                  dayAvailabilityToneForIso(iso, availability[listing.id] ?? [])
                }
              />
            </div>
          </div>
        </div>
        <details
          style={{
            fontSize: '0.85rem',
            marginBottom: 'var(--space-6)',
            color: 'var(--text-muted)',
          }}
        >
          <summary style={{ cursor: 'pointer', userSelect: 'none', color: 'var(--text-main)' }}>
            {t('mediationNoteOptional')}
          </summary>
          <div style={{ marginTop: 'var(--space-3)', display: 'grid', gap: 'var(--space-2)' }}>
            <textarea
              className="input"
              rows={2}
              maxLength={MAX_MEDIATION_NOTE_IN_NOTIFICATION}
              value={mediationNote}
              onChange={(e) => {
                const v = e.target.value
                setMediationNote(v)
                if (!v.trim()) setIncludeNoteInOwnerNotif(false)
              }}
              placeholder={t('mediationNotePlaceholder')}
              style={{
                marginBottom: 0,
                width: '100%',
                resize: 'vertical',
                minHeight: '48px',
                maxHeight: '120px',
                fontSize: '0.9rem',
              }}
            />
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-2)',
                cursor: 'pointer',
                color: 'var(--text-body)',
              }}
            >
              <input
                type="checkbox"
                checked={includeNoteInOwnerNotif}
                onChange={(e) => setIncludeNoteInOwnerNotif(e.target.checked)}
                style={{ marginTop: '2px', width: '18px', height: '18px' }}
              />
              <span>{t('includeMediationNoteInNotification')}</span>
            </label>
          </div>
        </details>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => close()}
            style={{
              background: 'none',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              padding: 'var(--space-3) var(--space-5)',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleMarkAsFormidlet()}
            disabled={sending}
            className="button button-success"
          >
            {sending ? (
              <ShieldCheck size={18} style={{ opacity: 0.5 }} />
            ) : (
              <ShieldCheck size={18} />
            )}
            {sending ? ` ${t('dbSavingShort')}` : ` ${t('dbConfirmMediation')}`}
          </button>
        </div>
      </div>
    </div>
  )
}
