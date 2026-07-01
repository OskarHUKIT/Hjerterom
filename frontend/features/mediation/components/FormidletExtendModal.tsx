'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase, getAuthUserDeduped } from '@/app/lib/supabase'
import type { ListingAvailabilityRow, NavDatabaseListingRow } from '@/app/lib/listingUiTypes'
import { useLanguage } from '@/context/LanguageContext'
import { formatDateNo } from '@/app/lib/dateFormat'
import { DateInput } from '@/app/components/DateInput'
import { supabaseErrorMessage } from '@/app/lib/supabaseErrorMessage'
import { dayAvailabilityToneForIso } from '@/app/lib/listingDayAvailabilityTone'
import { useToast, useConfirm } from '@/app/components/design-system'

export type FormidletExtendModalData = {
  listing: NavDatabaseListingRow
  period: ListingAvailabilityRow
}

export type FormidletExtendModalProps = {
  data: FormidletExtendModalData | null
  availability: Record<string, ListingAvailabilityRow[]>
  onClose: () => void
  onSuccess: () => void
}

export default function FormidletExtendModal({
  data,
  availability,
  onClose,
  onSuccess,
}: FormidletExtendModalProps) {
  const { t } = useLanguage()
  const toast = useToast()
  const confirmDialog = useConfirm()

  const [extendEnd, setExtendEnd] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!data?.period.end_date) return
    setExtendEnd(data.period.end_date)
  }, [data?.listing.id, data?.period.id, data?.period.end_date])

  const close = () => {
    if (sending) return
    onClose()
  }

  const handleExtendFormidlet = async () => {
    if (!data || !extendEnd) return
    const { listing, period } = data
    if (!period.id || !period.end_date) return
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
    if (new Date(extendEnd) < new Date(String(period.end_date))) {
      toast(t('dbExtendEndAfterCurrent'), 'error')
      return
    }
    const extendConfirmed = await confirmDialog({
      title: t('dbExtendButton'),
      message: t('dbExtendConfirm')
        .replace('{address}', String(listing.address ?? ''))
        .replace('{date}', formatDateNo(extendEnd)),
    })
    if (!extendConfirmed) return
    setSending(true)
    try {
      const { error } = await supabase
        .from('listing_availability')
        .update({ end_date: extendEnd })
        .eq('id', period.id)
      if (error) throw error
      const user = await getAuthUserDeduped()
      if (listing.owner_id) {
        await supabase.from('audit_logs').insert([
          {
            user_id: listing.owner_id,
            listing_id: listing.id,
            action_type: 'KOMMUNE_EXTEND_FORMIDLA',
            listing_address: listing.address,
            details: {
              performed_by_user_id: user?.id,
              period_id: period.id,
              new_end: extendEnd,
            },
          },
        ])
        await supabase
          .from('notifications')
          .insert([
            {
              owner_id: listing.owner_id,
              type: 'HOUSE_FORMIDLET',
              title: 'Formidlingsperiode forlenget',
              message: `Kommunen har forlenget formidlingsperioden for ${listing.address} til ${formatDateNo(extendEnd)}.`,
              listing_id: listing.id,
            },
          ])
      }
      onClose()
      onSuccess()
    } catch (err: unknown) {
      toast(t('errorPrefix') + supabaseErrorMessage(err), 'error')
    } finally {
      setSending(false)
    }
  }

  if (!data) return null

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
          <h3 style={{ margin: 0 }}>{t('dbModalExtendTitle')}</h3>
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
          {data.listing.address}
        </p>
        <p style={{ marginBottom: 'var(--space-3)', fontSize: '0.9rem' }}>
          {t('dbModalExtendCurrent')} {formatDateNo(data.period.start_date)} –{' '}
          {formatDateNo(data.period.end_date)}
        </p>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <label className="label">{t('dbModalNewEndDate')}</label>
          <DateInput
            showCalendar
            className="input"
            style={{ marginTop: 'var(--space-2)', width: '100%' }}
            value={extendEnd}
            onChange={setExtendEnd}
            min={data.period.end_date}
            placeholder={t('dateInputPlaceholder')}
            calendarDayTone={(iso) =>
              dayAvailabilityToneForIso(iso, availability[data.listing.id] ?? [])
            }
          />
        </div>
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
            onClick={() => void handleExtendFormidlet()}
            disabled={sending}
            className="button button-success"
          >
            {sending ? ` ${t('dbSavingShort')}` : t('dbExtendButton')}
          </button>
        </div>
      </div>
    </div>
  )
}
