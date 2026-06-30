'use client'

import { useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
import { supabase } from '@/app/lib/supabase'
import { submitBookingRequest } from '@/features/tourism/lib/submitBookingRequest'

type Props = {
  eventId: string
  primaryListingId: string
  nightlyPriceCents: number | null
}

export default function GroupBookingForm({ eventId, primaryListingId, nightlyPriceCents }: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const [extraListingId, setExtraListingId] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    checkIn: '',
    checkOut: '',
    acceptTerms: false,
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.acceptTerms || !form.name.trim() || !form.email.trim()) {
      toast(t('finnBookingRequired'), 'error')
      return
    }
    setBusy(true)
    const listingIds = [primaryListingId, extraListingId.trim()].filter(Boolean)
    const { data: group, error: groupErr } = await supabase
      .from('booking_groups')
      .insert([{ guest_email: form.email.trim(), event_id: eventId }])
      .select('id')
      .single()
    if (groupErr || !group) {
      toast(groupErr?.message ?? t('finnCheckoutError'), 'error')
      setBusy(false)
      return
    }
    for (const listingId of listingIds) {
      const result = await submitBookingRequest({
        listingId,
        eventId,
        guestName: form.name,
        guestEmail: form.email,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        amountCents: nightlyPriceCents,
      })
      if (!result.ok) {
        toast(result.error, 'error')
        setBusy(false)
        return
      }
      await supabase.from('bookings').update({ booking_group_id: group.id }).eq('id', result.id)
    }
    setBusy(false)
    toast(t('finnBookingSent'), 'success')
  }

  return (
    <section className="finn-card" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <h3 style={{ margin: '0 0 8px' }}>{t('finnGroupBookingTitle')}</h3>
      <p className="finn-card-meta" style={{ marginBottom: 12 }}>
        {t('finnGroupBookingLead')}
      </p>
      <form className="finn-inquiry-form" onSubmit={(e) => void submit(e)}>
        <label>
          {t('finnGroupBookingAdd')}
          <input value={extraListingId} onChange={(e) => setExtraListingId(e.target.value)} placeholder="uuid" />
        </label>
        <label>
          {t('finnInquiryName')}
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </label>
        <label>
          {t('finnInquiryEmail')}
          <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </label>
        <label>
          {t('finnFilterCheckIn')}
          <input type="date" required value={form.checkIn} onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))} />
        </label>
        <label>
          {t('finnFilterCheckOut')}
          <input type="date" required value={form.checkOut} onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))} />
        </label>
        <label style={{ display: 'flex', gap: 8 }}>
          <input type="checkbox" checked={form.acceptTerms} onChange={(e) => setForm((f) => ({ ...f, acceptTerms: e.target.checked }))} />
          <span>{t('finnGuestTermsAccept')}</span>
        </label>
        <Button type="submit" variant="accent" disabled={busy}>
          {t('finnBookingSubmit')}
        </Button>
      </form>
    </section>
  )
}
