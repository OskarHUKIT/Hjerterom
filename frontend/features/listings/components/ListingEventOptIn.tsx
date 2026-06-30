'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'

type PublishedEvent = {
  id: string
  name: string
  start_date: string
  end_date: string
  arrangement_tag: string | null
}

type OptInRow = {
  event_id: string
  status: string
}

type Props = {
  listingId: string
}

export default function ListingEventOptIn({ listingId }: Props) {
  const { t } = useLanguage()
  const toast = useToast()
  const [events, setEvents] = useState<PublishedEvent[]>([])
  const [optIns, setOptIns] = useState<Record<string, OptInRow>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      const [{ data: published }, { data: mine }] = await Promise.all([
        supabase
          .from('central_events')
          .select('id, name, start_date, end_date, arrangement_tag')
          .eq('status', 'published')
          .order('start_date', { ascending: true }),
        supabase
          .from('listing_event_availability')
          .select('event_id, status')
          .eq('listing_id', listingId),
      ])

      if (cancelled) return
      setEvents((published ?? []) as PublishedEvent[])
      const map: Record<string, OptInRow> = {}
      ;(mine ?? []).forEach((row) => {
        map[row.event_id] = row as OptInRow
      })
      setOptIns(map)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [listingId])

  const toggle = async (event: PublishedEvent, active: boolean) => {
    setBusyId(event.id)
    try {
      if (active) {
        const { error } = await supabase.from('listing_event_availability').upsert(
          [
            {
              listing_id: listingId,
              event_id: event.id,
              available_from: event.start_date,
              available_to: event.end_date,
              status: 'active',
            },
          ],
          { onConflict: 'listing_id,event_id' }
        )
        if (error) throw error
        setOptIns((prev) => ({ ...prev, [event.id]: { event_id: event.id, status: 'active' } }))
        const user = await supabase.auth.getUser()
        await supabase.from('audit_logs').insert([
          {
            user_id: user.data.user?.id ?? null,
            action_type: 'EVENT_OPT_IN',
            details: { event_id: event.id, listing_id: listingId, event_name: event.name },
          },
        ])
        toast(t('eventOptInSuccess'), 'success')
      } else {
        const { error } = await supabase
          .from('listing_event_availability')
          .update({ status: 'withdrawn' })
          .eq('listing_id', listingId)
          .eq('event_id', event.id)
        if (error) throw error
        setOptIns((prev) => {
          const next = { ...prev }
          delete next[event.id]
          return next
        })
      }
    } catch {
      toast(t('errSaveListing'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return null

  return (
    <section className="card" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <h4 style={{ margin: '0 0 var(--space-3)' }}>{t('eventOptInTitle')}</h4>
      {events.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)', margin: 0 }}>
          {t('eventOptInEmpty')}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
          {events.map((event) => {
            const active = optIns[event.id]?.status === 'active'
            return (
              <li
                key={event.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{event.name}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {event.start_date} – {event.end_date}
                    {event.arrangement_tag ? ` · ${event.arrangement_tag}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={active ? 'secondary' : 'accent'}
                  disabled={busyId === event.id}
                  onClick={() => void toggle(event, !active)}
                >
                  {active ? t('eventOptInWithdraw') : t('eventOptInYes')}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
