'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
import LoadingPlaceholder from '@/app/components/LoadingPlaceholder'
import { formatDateTimeNo } from '@/app/lib/dateFormat'

type Inquiry = {
  id: string
  created_at: string
  status: string
  contact_name: string
  contact_email: string
  message: string | null
  event_id: string
  central_events: { name: string } | { name: string }[] | null
}

export default function EventStaffInquiriesPage() {
  const { t } = useLanguage()
  const toast = useToast()
  const [rows, setRows] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    const { data: staffRows } = await supabase
      .from('central_event_staff')
      .select('event_id')
      .eq('profile_id', auth.user.id)
    const eventIds = (staffRows ?? []).map((r) => r.event_id)
    if (eventIds.length === 0) {
      setRows([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('event_inquiries')
      .select('id, created_at, status, contact_name, contact_email, message, event_id, central_events(name)')
      .in('event_id', eventIds)
      .order('created_at', { ascending: false })
      .limit(50)
    setRows((data ?? []) as Inquiry[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const updateStatus = async (id: string, status: string, assignSelf = false) => {
    setBusyId(id)
    const { data: auth } = await supabase.auth.getUser()
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (assignSelf && auth.user) patch.assigned_profile_id = auth.user.id
    const { error } = await supabase.from('event_inquiries').update(patch).eq('id', id)
    setBusyId(null)
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast(t('opsSaved'), 'success')
    void load()
  }

  if (loading) return <LoadingPlaceholder />

  return (
    <div>
      <h1 style={{ margin: '0 0 16px' }}>{t('eventNavInquiries')}</h1>
      {rows.length === 0 ? (
        <p style={{ opacity: 0.7 }}>{t('eventInquiriesEmpty')}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((row) => {
            const ev = Array.isArray(row.central_events) ? row.central_events[0] : row.central_events
            return (
              <li key={row.id} className="card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong>{row.contact_name}</strong>
                  <span style={{ fontSize: '0.82rem', opacity: 0.7 }}>{formatDateTimeNo(row.created_at)}</span>
                </div>
                <p style={{ margin: '6px 0', fontSize: '0.88rem' }}>
                  🎫 {ev?.name ?? '—'} · {row.status}
                </p>
                <p style={{ margin: '0 0 8px', fontSize: '0.85rem' }}>{row.contact_email}</p>
                {row.message ? (
                  <p style={{ margin: '0 0 12px', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{row.message}</p>
                ) : null}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {row.status === 'new' && (
                    <Button
                      type="button"
                      variant="accent"
                      disabled={busyId === row.id}
                      onClick={() => void updateStatus(row.id, 'assigned', true)}
                    >
                      {t('navLosInboxAssign')}
                    </Button>
                  )}
                  {row.status !== 'closed' && (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyId === row.id}
                      onClick={() => void updateStatus(row.id, 'closed')}
                    >
                      {t('navLosInboxClose')}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
