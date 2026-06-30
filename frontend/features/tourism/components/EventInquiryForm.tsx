'use client'

import { useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
import { submitEventInquiry } from '@/features/tourism/lib/submitEventInquiry'

type Props = {
  eventId: string
  listingId?: string | null
  isTourismRouting: boolean
  eventStart: string
  eventEnd: string
}

export default function EventInquiryForm({
  eventId,
  listingId,
  isTourismRouting,
  eventStart,
  eventEnd,
}: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    dateFrom: eventStart,
    dateTo: eventEnd,
  })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      toast(t('finnInquiryRequired'), 'error')
      return
    }
    setSubmitting(true)
    const result = await submitEventInquiry({
      eventId,
      listingId,
      contactName: form.name,
      contactEmail: form.email,
      contactPhone: form.phone,
      message: form.message,
      dateFrom: form.dateFrom,
      dateTo: form.dateTo,
    })
    setSubmitting(false)
    if (!result.ok) {
      toast(result.error, 'error')
      return
    }
    toast(t('finnInquirySent'), 'success')
    setForm({ name: '', email: '', phone: '', message: '', dateFrom: eventStart, dateTo: eventEnd })
  }

  return (
    <section aria-labelledby="finn-inquiry-title">
      <h2 id="finn-inquiry-title" className="finn-section-title">
        {isTourismRouting ? t('finnInquiryTourismTitle') : t('finnInquirySaksTitle')}
      </h2>
      <p className="finn-card-meta">{t('finnInquiryLeadStored')}</p>
      <form className="finn-inquiry-form" onSubmit={(e) => void onSubmit(e)}>
        <label>
          {t('finnInquiryName')}
          <input
            required
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label>
          {t('finnInquiryEmail')}
          <input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </label>
        <label>
          {t('finnInquiryPhone')}
          <input
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </label>
        <label>
          {t('finnFilterCheckIn')}
          <input
            type="date"
            value={form.dateFrom}
            min={eventStart}
            max={eventEnd}
            onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
          />
        </label>
        <label>
          {t('finnFilterCheckOut')}
          <input
            type="date"
            value={form.dateTo}
            min={eventStart}
            max={eventEnd}
            onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
          />
        </label>
        <label>
          {t('finnInquiryMessage')}
          <textarea
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          />
        </label>
        <Button type="submit" variant="accent" disabled={submitting}>
          {isTourismRouting ? t('finnInquirySendRequest') : t('finnInquiryAskHousing')}
        </Button>
      </form>
    </section>
  )
}
