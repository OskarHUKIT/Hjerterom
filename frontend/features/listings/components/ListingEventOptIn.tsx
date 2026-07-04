'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/app/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { SignTermsLink, useToast } from '@/app/components/design-system'
import { Button } from '@/app/components/ui/Button'
import { useSignTermsIdentityGate } from '@/features/auth/hooks/useSignTermsIdentityGate'
import { buildSignTermsHref } from '@/features/auth/lib/signTermsNavigation'
import {
  publishedEventsQueryKey,
  usePublishedEventsQuery,
  type PublishedCentralEvent,
} from '@/features/events/hooks/usePublishedEventsQuery'
import '@/features/listings/landlord-manage.css'

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
  const { requestSignTerms, SignTermsIdentityDialog } = useSignTermsIdentityGate()
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

  const returnTo = `/homeowner/listings/${listingId}?section=events`

  const signTermsUrlForEvent = (eventId: string) => {
    const doc = termsDocByEvent[eventId]
    return buildSignTermsHref({ doc, returnTo })
  }

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
            const doc = termsDocByEvent[event.id]
            if (doc) {
              requestSignTerms(signTermsUrlForEvent(event.id))
            } else {
              toast(t('eventOptInTermsRequired'), 'error')
            }
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

  return (
    <section className="card listing-subpanel">
      <div className="listing-subpanel-head">
        <h4>{t('eventOptInTitle')}</h4>
      </div>
      {!events?.length ? (
        <p className="text-sm listing-subpanel-lead listing-subpanel-lead--empty">
          {t('eventOptInEmpty')}
        </p>
      ) : (
        <ul className="listing-subpanel-list listing-subpanel-list--flat">
          {events.map((event) => {
            const active = optIns[event.id]?.status === 'active'
            const termsDocId = termsDocByEvent[event.id]
            return (
              <li key={event.id} className="listing-subpanel-list-item">
                <div>
                  <p className="listing-subpanel-row-title">{event.name}</p>
                  <p className="listing-subpanel-row-meta">
                    {event.start_date} – {event.end_date}
                    {event.arrangement_tag ? ` · ${event.arrangement_tag}` : ''}
                  </p>
                </div>
                <div className="listing-subpanel-actions">
                  {termsDocId ? (
                    <SignTermsLink
                      href={signTermsUrlForEvent(event.id)}
                      className="text-sm nav-link listing-text-link"
                    >
                      {t('eventOptInSignTermsCta')}
                    </SignTermsLink>
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
      <SignTermsIdentityDialog />
    </section>
  )
}
