'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/app/lib/supabase'
import { Button } from '@/app/components/ui/Button'
import { useToast } from '@/app/components/design-system'

type GuestRow = {
  id: string
  guest_email: string
  guest_name: string | null
}

type Props = {
  bookingId: string
}

export default function BookingGuestListPanel({ bookingId }: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const [guests, setGuests] = useState<GuestRow[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await supabase.rpc('list_booking_guests', { p_booking_id: bookingId })
    setGuests((data ?? []) as GuestRow[])
  }

  useEffect(() => {
    void load()
  }, [bookingId])

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    const { data, error } = await supabase.rpc('invite_booking_guest', {
      p_booking_id: bookingId,
      p_guest_email: email.trim(),
      p_guest_name: name.trim() || null,
    })
    setBusy(false)
    if (error || data?.ok === false) {
      toast(error?.message ?? t('guestListInviteError'), 'error')
      return
    }
    setEmail('')
    setName('')
    toast(t('guestListInviteSent'), 'success')
    void load()
  }

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontWeight: 600, margin: '0 0 8px' }}>{t('guestListTitle')}</p>
      <p className="finn-card-meta" style={{ margin: '0 0 8px' }}>
        {t('guestListLead')}
      </p>
      {guests.length > 0 ? (
        <ul style={{ margin: '0 0 12px', paddingLeft: 18 }}>
          {guests.map((g) => (
            <li key={g.id}>
              {g.guest_name ? `${g.guest_name} · ` : ''}
              {g.guest_email}
            </li>
          ))}
        </ul>
      ) : null}
      <form className="finn-inquiry-form" style={{ marginTop: 0 }} onSubmit={(e) => void invite(e)}>
        <label>
          {t('finnInquiryName')}
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          {t('finnInquiryEmail')}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <Button type="submit" variant="secondary" disabled={busy}>
          {t('guestListInvite')}
        </Button>
      </form>
    </div>
  )
}
