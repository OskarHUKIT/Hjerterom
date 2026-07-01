'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useToast } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
import {
  publishedEventsQueryKey,
  usePublishedEventsQuery,
  type PublishedCentralEvent,
} from '@/features/events/hooks/usePublishedEventsQuery'

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
  const queryClient = useQueryClient()
  const { data, isLoading } = usePublishedEventsQuery([listingId])
  const [termsDocByEvent, setTermsDocByEvent] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const events = data?.events
  const optIns = useMemo(() => {
    const map: Record<string, OptInRow> = {}
    ;(data?.optIns ?? []).forEach((row) => {
      map[row.event_id] = { event_id: row.event_id, status: row.status }
    })
    return map
  }, [data?.optIns])

  useEffect(() => {
    if (!events || events.length === 0) {
      setTermsDocByEvent({})
      return
    }
    let cancelled = false
    void (async () => {
      const { data: termsDocs } = await supabase
        .from('terms_documents')
        .select('id, event_id, version')
        .eq('scope', 'event')
        .eq('approved_for_utleier_signing', true)
        .in(
          'event_id',
          events.map((e) => e.id)
        )
        .order('version', { ascending: false })
      if (cancelled) return
      const docMap: Record<string, string> = {}
      ;(termsDocs ?? []).forEach((row) => {
        if (row.event_id && !docMap[row.event_id]) {
          docMap[row.event_id] = row.id
        }
      })
      setTermsDocByEvent(docMap)
    })()
    return () => {
      cancelled = true
    }
  }, [events])

  const toggle = async (event: PublishedCentralEvent, active: boolean) => {
    setBusyId(event.id)
    try {
      if (active) {
        const user = await supabase.auth.getUser()
        const uid = user.data.user?.id
        if (uid) {
          const { data: ok } = await supabase.rpc('landlord_has_event_terms_signed', {
            p_user_id: uid,
            p_event_id: event.id,
          })
          if (ok === false) {
            toast(t('eventOptInTermsRequired'), 'error')
            setBusyId(null)
            return
          }
        }
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
        const authUser = await supabase.auth.getUser()
        await supabase.from('audit_logs').insert([
          {
            user_id: authUser.data.user?.id ?? null,
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
      }
      await queryClient.invalidateQueries({ queryKey: publishedEventsQueryKey([listingId]) })
    } catch {
      toast(t('errSaveListing'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  if (isLoading) return null

  const returnTo = `/homeowner/manage?listing=${listingId}&panel=events`

  return (
    <section className="card" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <h4 style={{ margin: '0 0 var(--space-3)' }}>{t('eventOptInTitle')}</h4>
      {!events?.length ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)', margin: 0 }}>
          {t('eventOptInEmpty')}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
          {events.map((event) => {
            const active = optIns[event.id]?.status === 'active'
            const termsDocId = termsDocByEvent[event.id]
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {termsDocId ? (
                    <Link
                      href={`/homeowner/sign-terms?doc=${termsDocId}&returnTo=${encodeURIComponent(returnTo)}`}
                      className="text-sm nav-link"
                      style={{ fontWeight: 600 }}
                    >
                      {t('eventOptInSignTermsCta')}
                    </Link>
                  ) : null}
                  <Button
                    type="button"
                    variant={active ? 'secondary' : 'accent'}
                    disabled={busyId === event.id}
                    onClick={() => void toggle(event, !active)}
                  >
                    {active ? t('eventOptInWithdraw') : t('eventOptInYes')}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
